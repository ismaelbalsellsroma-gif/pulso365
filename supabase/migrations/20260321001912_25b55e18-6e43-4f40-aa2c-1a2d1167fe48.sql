
CREATE TABLE public.aprendizaje (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descripcion text NOT NULL,
  datos_antes jsonb,
  datos_despues jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aprendizaje ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aprendizaje_select" ON public.aprendizaje FOR SELECT TO public USING (true);
CREATE POLICY "aprendizaje_insert" ON public.aprendizaje FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "aprendizaje_delete" ON public.aprendizaje FOR DELETE TO public USING (true);
