ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_sections" ON public.sections
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_questions" ON public.questions
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_responses" ON public.responses
  FOR INSERT TO anon WITH CHECK (true);
