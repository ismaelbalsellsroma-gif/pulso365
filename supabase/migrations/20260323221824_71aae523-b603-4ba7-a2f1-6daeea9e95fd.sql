
-- Sugerencias de precio
CREATE TABLE public.sugerencias_precio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plato_id uuid NOT NULL REFERENCES public.platos(id) ON DELETE CASCADE,
  plato_nombre text DEFAULT '',
  familia text DEFAULT '',
  pvp_actual numeric DEFAULT 0,
  coste_anterior numeric DEFAULT 0,
  food_cost_anterior_pct numeric DEFAULT 0,
  margen_anterior numeric DEFAULT 0,
  coste_nuevo numeric DEFAULT 0,
  food_cost_nuevo_pct numeric DEFAULT 0,
  margen_nuevo numeric DEFAULT 0,
  producto_id uuid REFERENCES public.productos(id),
  producto_nombre text DEFAULT '',
  precio_producto_anterior numeric DEFAULT 0,
  precio_producto_nuevo numeric DEFAULT 0,
  variacion_producto_pct numeric DEFAULT 0,
  tipo_sugerencia text DEFAULT '',
  pvp_sugerido numeric,
  pvp_sugerido_con_iva numeric,
  descripcion text DEFAULT '',
  estado text DEFAULT 'pendiente',
  fecha_aplicada timestamptz,
  notas_usuario text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sugerencias_precio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sugerencias_precio_all" ON public.sugerencias_precio FOR ALL TO public USING (true) WITH CHECK (true);

-- Historial PVP carta
CREATE TABLE public.historial_pvp_carta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plato_id uuid NOT NULL REFERENCES public.platos(id) ON DELETE CASCADE,
  pvp_anterior numeric DEFAULT 0,
  pvp_nuevo numeric DEFAULT 0,
  motivo text DEFAULT '',
  sugerencia_id uuid REFERENCES public.sugerencias_precio(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.historial_pvp_carta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historial_pvp_carta_all" ON public.historial_pvp_carta FOR ALL TO public USING (true) WITH CHECK (true);

-- Cuentas bancarias
CREATE TABLE public.cuentas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  iban text DEFAULT '',
  banco text DEFAULT '',
  saldo_actual numeric DEFAULT 0,
  ultima_actualizacion timestamptz,
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cuentas_bancarias_all" ON public.cuentas_bancarias FOR ALL TO public USING (true) WITH CHECK (true);

-- Movimientos bancarios
CREATE TABLE public.movimientos_bancarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id uuid NOT NULL REFERENCES public.cuentas_bancarias(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  fecha_valor date,
  concepto text DEFAULT '',
  importe numeric NOT NULL,
  saldo numeric,
  referencia text DEFAULT '',
  estado text DEFAULT 'pendiente',
  tipo_detectado text DEFAULT '',
  entidad_id uuid,
  entidad_nombre text DEFAULT '',
  factura_id uuid,
  confianza_match numeric DEFAULT 0,
  notas text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.movimientos_bancarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movimientos_bancarios_all" ON public.movimientos_bancarios FOR ALL TO public USING (true) WITH CHECK (true);

-- Reglas de conciliación
CREATE TABLE public.reglas_conciliacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patron_concepto text NOT NULL,
  tipo text NOT NULL,
  entidad_id uuid,
  entidad_nombre text DEFAULT '',
  categoria text DEFAULT '',
  veces_usado integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reglas_conciliacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reglas_conciliacion_all" ON public.reglas_conciliacion FOR ALL TO public USING (true) WITH CHECK (true);
