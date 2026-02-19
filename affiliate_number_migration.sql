-- ============================================================
-- Add affiliate_number to stores table
-- Auto-generates PAP-001, PAP-002, etc.
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add column
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS affiliate_number TEXT UNIQUE;

-- 2. Create sequence for auto-numbering
CREATE SEQUENCE IF NOT EXISTS affiliate_number_seq START 1;

-- 3. Backfill existing stores with affiliate numbers (ordered by creation date)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.stores
  WHERE affiliate_number IS NULL
)
UPDATE public.stores s
SET affiliate_number = 'PAP-' || LPAD(n.rn::TEXT, 3, '0')
FROM numbered n
WHERE s.id = n.id;

-- 4. Set sequence to continue after existing stores
SELECT setval('affiliate_number_seq', COALESCE(
  (SELECT MAX(REPLACE(affiliate_number, 'PAP-', '')::INT) FROM public.stores WHERE affiliate_number IS NOT NULL),
  0
));

-- 5. Function to auto-assign affiliate_number on new stores
CREATE OR REPLACE FUNCTION assign_affiliate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.affiliate_number IS NULL THEN
    NEW.affiliate_number := 'PAP-' || LPAD(nextval('affiliate_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_affiliate_number
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION assign_affiliate_number();
