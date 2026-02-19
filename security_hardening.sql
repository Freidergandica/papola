-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Roles, Approval Workflow & RLS
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1A. Add pending_store_owner to role CHECK constraint
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'store_owner', 'customer', 'driver', 'pending_store_owner'));


-- ============================================================
-- 1B. Trigger: auto-create profile on user signup
-- Reads raw_user_meta_data->>'signup_type':
--   'store' → pending_store_owner
--   anything else → customer
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _signup_type TEXT;
  _role TEXT;
  _full_name TEXT;
BEGIN
  _signup_type := NEW.raw_user_meta_data->>'signup_type';

  IF _signup_type = 'store' THEN
    _role := 'pending_store_owner';
  ELSE
    _role := 'customer';
  END IF;

  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'store_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (NEW.id, NEW.email, _role, _full_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 1C. Trigger: prevent role self-escalation
-- Only admins can change roles. Non-admins get their role
-- silently reverted.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _caller_role TEXT;
BEGIN
  -- If role didn't change, allow
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- Service role key (backend/admin client): auth.uid() = NULL → allow
  -- Only JWTs de usuarios tienen uid; la service role no envía JWT de usuario
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the caller is an admin
  SELECT role INTO _caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF _caller_role IS DISTINCT FROM 'admin' THEN
    -- Silently revert the role change
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();


-- ============================================================
-- 1D. RLS — profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to rebuild cleanly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;

-- SELECT: own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- SELECT: admin sees all
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: own profile only (for trigger / edge cases)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE: admin can update any profile (for role changes)
CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 1E. RLS — stores
-- ============================================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to rebuild
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can view own stores" ON public.stores;
DROP POLICY IF EXISTS "Owner can insert store" ON public.stores;
DROP POLICY IF EXISTS "Owner can update own store" ON public.stores;
DROP POLICY IF EXISTS "Admin can view all stores" ON public.stores;
DROP POLICY IF EXISTS "Admin can update any store" ON public.stores;
DROP POLICY IF EXISTS "Admin can insert stores" ON public.stores;

-- SELECT: public catalog (all stores visible for browsing)
CREATE POLICY "Anyone can view stores"
  ON public.stores FOR SELECT
  USING (true);

-- INSERT: owner must be auth.uid(), role must be store_owner, pending_store_owner, or admin
CREATE POLICY "Owner can insert store"
  ON public.stores FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('store_owner', 'pending_store_owner', 'admin')
    )
  );

-- UPDATE: owner or admin
CREATE POLICY "Owner can update own store"
  ON public.stores FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admin can update any store"
  ON public.stores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 1F. RLS — products
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Store owner can insert products" ON public.products;
DROP POLICY IF EXISTS "Store owner can update own products" ON public.products;
DROP POLICY IF EXISTS "Store owner can delete own products" ON public.products;
DROP POLICY IF EXISTS "Admin can manage all products" ON public.products;

-- SELECT: public
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

-- INSERT: only store owner of the store, or admin
CREATE POLICY "Store owner can insert products"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_id
      AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: only store owner of the store, or admin
CREATE POLICY "Store owner can update own products"
  ON public.products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_id
      AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: only store owner of the store, or admin
CREATE POLICY "Store owner can delete own products"
  ON public.products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_id
      AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 1G. RLS — order_items
-- ============================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Store owner can view order items for their store" ON public.order_items;
DROP POLICY IF EXISTS "Admin can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Customer can insert own order items" ON public.order_items;

-- SELECT: customer sees their own order items
CREATE POLICY "Customer can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- SELECT: store owner sees order items for their store
CREATE POLICY "Store owner can view order items for their store"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.stores ON stores.id = orders.store_id
      WHERE orders.id = order_id
      AND stores.owner_id = auth.uid()
    )
  );

-- SELECT: admin sees all
CREATE POLICY "Admin can view all order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: customer can insert items for their own orders
CREATE POLICY "Customer can insert own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies for order_items


-- ============================================================
-- 1H. RLS — orders (enhance existing)
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Store owner can view orders for their store" ON public.orders;
DROP POLICY IF EXISTS "Admin can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can update any order" ON public.orders;
DROP POLICY IF EXISTS "Customer can insert own orders" ON public.orders;

-- SELECT: customer sees own orders
CREATE POLICY "Customer can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

-- SELECT: store owner sees orders for their store
CREATE POLICY "Store owner can view orders for their store"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- SELECT: admin sees all
CREATE POLICY "Admin can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: customer can create orders
CREATE POLICY "Customer can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- UPDATE: admin can update any order (status changes, etc.)
CREATE POLICY "Admin can update any order"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No DELETE for anyone


-- ============================================================
-- 1I. Storage — products bucket: restrict uploads
-- ============================================================
-- Remove overly permissive upload policy
DROP POLICY IF EXISTS "Anyone can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can upload product images" ON storage.objects;

-- Only store_owner and admin can upload to products bucket
CREATE POLICY "Store owners can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('store_owner', 'admin')
    )
  );

-- Public read access for product images (keep existing or create)
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Store owners can update their own uploads
DROP POLICY IF EXISTS "Store owners can update product images" ON storage.objects;
CREATE POLICY "Store owners can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('store_owner', 'admin')
    )
  );

-- Store owners can delete their own uploads
DROP POLICY IF EXISTS "Store owners can delete product images" ON storage.objects;
CREATE POLICY "Store owners can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('store_owner', 'admin')
    )
  );
