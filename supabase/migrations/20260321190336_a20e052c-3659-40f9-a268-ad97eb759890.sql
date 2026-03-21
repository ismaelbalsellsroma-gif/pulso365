
-- Stock conteos: cada conteo individual de un producto
CREATE TABLE public.stock_conteos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad numeric NOT NULL DEFAULT 0,
    unidad text DEFAULT 'kg',
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    semana integer,
    anyo integer,
    tipo text DEFAULT 'rotativo',
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_conteos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_conteos_select" ON public.stock_conteos FOR SELECT TO public USING (true);
CREATE POLICY "stock_conteos_insert" ON public.stock_conteos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "stock_conteos_update" ON public.stock_conteos FOR UPDATE TO public USING (true);
CREATE POLICY "stock_conteos_delete" ON public.stock_conteos FOR DELETE TO public USING (true);

-- Stock solicitudes semanales: productos asignados para contar cada semana
CREATE TABLE public.stock_solicitudes_semanales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    semana integer NOT NULL,
    anyo integer NOT NULL,
    producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    completado boolean DEFAULT false,
    fecha_completado timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(semana, anyo, producto_id)
);

ALTER TABLE public.stock_solicitudes_semanales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_solicitudes_select" ON public.stock_solicitudes_semanales FOR SELECT TO public USING (true);
CREATE POLICY "stock_solicitudes_insert" ON public.stock_solicitudes_semanales FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "stock_solicitudes_update" ON public.stock_solicitudes_semanales FOR UPDATE TO public USING (true);
CREATE POLICY "stock_solicitudes_delete" ON public.stock_solicitudes_semanales FOR DELETE TO public USING (true);

-- Stock desviaciones: consumo real vs teórico
CREATE TABLE public.stock_desviaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    periodo_inicio date NOT NULL,
    periodo_fin date NOT NULL,
    stock_inicial numeric,
    compras_periodo numeric,
    stock_final numeric,
    consumo_real numeric,
    consumo_teorico numeric,
    desviacion numeric,
    desviacion_porcentaje numeric,
    desviacion_euros numeric DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_desviaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_desviaciones_select" ON public.stock_desviaciones FOR SELECT TO public USING (true);
CREATE POLICY "stock_desviaciones_insert" ON public.stock_desviaciones FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "stock_desviaciones_delete" ON public.stock_desviaciones FOR DELETE TO public USING (true);

CREATE INDEX idx_stock_conteos_producto ON public.stock_conteos(producto_id);
CREATE INDEX idx_stock_conteos_fecha ON public.stock_conteos(fecha);
CREATE INDEX idx_stock_solicitudes_semana ON public.stock_solicitudes_semanales(semana, anyo);
CREATE INDEX idx_stock_desviaciones_producto ON public.stock_desviaciones(producto_id);
