DO $$
DECLARE
  max_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'assessments_id_seq' AND c.relkind = 'S') THEN
    SELECT coalesce(max(id), 0) + 1 INTO max_id FROM public.assessments;
    CREATE SEQUENCE public.assessments_id_seq START 1;
    PERFORM setval('public.assessments_id_seq', greatest(1, max_id));
  END IF;
  ALTER TABLE public.assessments
    ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq');
END;
$$;
