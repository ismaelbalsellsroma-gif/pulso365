
-- Module 1: Demand Prediction & Smart Orders
CREATE TABLE public.predicciones_demanda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_prediccion date NOT NULL,
  familia text NOT NULL,
  unidades_predichas numeric DEFAULT 0,
  confianza numeric DEFAULT 0,
  basado_en_semanas integer DEFAULT 8,
  factores jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.predicciones_demanda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predicciones_demanda_all" ON public.predicciones_demanda FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.pedidos_sugeridos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_generado date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega date NOT NULL,
  proveedor_id uuid REFERENCES public.proveedores(id),
  proveedor_nombre text DEFAULT '',
  estado text DEFAULT 'borrador',
  total_estimado numeric DEFAULT 0,
  notas text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pedidos_sugeridos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_sugeridos_all" ON public.pedidos_sugeridos FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.pedido_sugerido_lineas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_sugeridos(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.productos(id),
  producto_nombre text DEFAULT '',
  cantidad_sugerida numeric DEFAULT 0,
  cantidad_ajustada numeric,
  unidad text DEFAULT 'ud',
  precio_estimado numeric DEFAULT 0,
  motivo text DEFAULT '',
  stock_actual numeric DEFAULT 0,
  consumo_previsto numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pedido_sugerido_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedido_sugerido_lineas_all" ON public.pedido_sugerido_lineas FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.stock_minimos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL UNIQUE REFERENCES public.productos(id) ON DELETE CASCADE,
  cantidad_minima numeric DEFAULT 0,
  cantidad_reposicion numeric DEFAULT 0,
  dias_entrega integer DEFAULT 1
);
ALTER TABLE public.stock_minimos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_minimos_all" ON public.stock_minimos FOR ALL USING (true) WITH CHECK (true);

-- Module 2: Menu Engineering
CREATE TABLE public.ingenieria_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio date NOT NULL,
  periodo_fin date NOT NULL,
  plato_id uuid NOT NULL REFERENCES public.platos(id) ON DELETE CASCADE,
  plato_nombre text DEFAULT '',
  familia text DEFAULT '',
  unidades_vendidas numeric DEFAULT 0,
  ingresos numeric DEFAULT 0,
  food_cost_unitario numeric DEFAULT 0,
  food_cost_pct numeric DEFAULT 0,
  margen_unitario numeric DEFAULT 0,
  margen_total numeric DEFAULT 0,
  popularidad text DEFAULT '',
  rentabilidad text DEFAULT '',
  clasificacion text DEFAULT '',
  accion_sugerida text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ingenieria_menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingenieria_menu_all" ON public.ingenieria_menu FOR ALL USING (true) WITH CHECK (true);

-- Module 3: Waste/Shrinkage
CREATE TABLE public.mermas_registradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  producto_nombre text DEFAULT '',
  cantidad numeric NOT NULL,
  unidad text DEFAULT 'kg',
  motivo text DEFAULT '',
  coste_estimado numeric DEFAULT 0,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  registrado_por text DEFAULT '',
  notas text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.mermas_registradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mermas_registradas_all" ON public.mermas_registradas FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.alertas_merma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  producto_nombre text DEFAULT '',
  tipo text NOT NULL,
  mensaje text DEFAULT '',
  desviacion_pct numeric DEFAULT 0,
  coste_perdida numeric DEFAULT 0,
  periodo text DEFAULT '',
  leida boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.alertas_merma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_merma_all" ON public.alertas_merma FOR ALL USING (true) WITH CHECK (true);
