-- Fix: Infinite recursion in RLS policies
-- The profiles policy references orders, and orders policies trigger
-- evaluation of related table policies, creating a cycle.
-- Solution: Use a SECURITY DEFINER function to bypass RLS in the subquery.

-- Step 1: Create function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_store_owner_of_customer(customer_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.stores s ON o.store_id = s.id
    WHERE o.customer_id = customer_uuid
    AND s.owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "Store owners can view customer profiles for their orders" ON public.profiles;

-- Step 3: Recreate with the function (no more recursion)
CREATE POLICY "Store owners can view customer profiles for their orders"
ON public.profiles FOR SELECT
USING (public.is_store_owner_of_customer(id));
