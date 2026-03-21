-- Allow delete and update on arqueo_familias (needed for upsert/delete flow)
CREATE POLICY "arqueo_familias_delete" ON public.arqueo_familias FOR DELETE TO public USING (true);
CREATE POLICY "arqueo_familias_update" ON public.arqueo_familias FOR UPDATE TO public USING (true);