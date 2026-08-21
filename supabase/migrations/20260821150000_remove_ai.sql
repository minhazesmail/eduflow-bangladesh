-- Remove the retired EduFlow AI feature and its usage ledger.
DO $$
BEGIN
  IF to_regclass('public.ai_usage') IS NOT NULL THEN
    DROP TABLE public.ai_usage CASCADE;
  END IF;
END $$;
