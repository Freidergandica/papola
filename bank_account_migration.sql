-- ============================================================
-- Bank Account Management for Stores
-- ============================================================

-- 1. Add bank account columns to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_account_holder_id TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_account_type TEXT CHECK (bank_account_type IN ('corriente', 'ahorro'));

-- 2. Create bank_account_changes table
CREATE TABLE IF NOT EXISTS public.bank_account_changes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) NOT NULL,

  -- Requested new values
  new_bank_name TEXT NOT NULL,
  new_account_number TEXT NOT NULL,
  new_account_holder_id TEXT NOT NULL,
  new_account_type TEXT CHECK (new_account_type IN ('corriente', 'ahorro')) NOT NULL,

  -- Current values at time of request (for side-by-side comparison)
  old_bank_name TEXT,
  old_account_number TEXT,
  old_account_holder_id TEXT,
  old_account_type TEXT,

  -- Approval workflow
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_bank_changes_store ON public.bank_account_changes(store_id);
CREATE INDEX IF NOT EXISTS idx_bank_changes_pending ON public.bank_account_changes(status) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_per_store ON public.bank_account_changes(store_id) WHERE status = 'pending';

-- 4. RLS Policies
ALTER TABLE public.bank_account_changes ENABLE ROW LEVEL SECURITY;

-- Store owners can view their own change requests
CREATE POLICY "Store owners can view own bank change requests" ON public.bank_account_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = bank_account_changes.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Store owners can create change requests for their own store
CREATE POLICY "Store owners can create bank change requests" ON public.bank_account_changes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = bank_account_changes.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Admins can view all change requests
CREATE POLICY "Admins can view all bank change requests" ON public.bank_account_changes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update change requests (approve/reject)
CREATE POLICY "Admins can update bank change requests" ON public.bank_account_changes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
