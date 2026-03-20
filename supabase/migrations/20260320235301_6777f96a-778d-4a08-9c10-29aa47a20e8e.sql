
-- ═══ Función para updated_at ═══
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ═══ Proveedores ═══
CREATE TABLE public.proveedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipos TEXT[] DEFAULT '{}',
  contacto TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  email TEXT DEFAULT '',
  cif TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proveedores_select" ON public.proveedores FOR SELECT USING (true);
CREATE POLICY "proveedores_insert" ON public.proveedores FOR INSERT WITH CHECK (true);
CREATE POLICY "proveedores_update" ON public.proveedores FOR UPDATE USING (true);
CREATE POLICY "proveedores_delete" ON public.proveedores FOR DELETE USING (true);
CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Categorías ═══
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  tipo TEXT DEFAULT 'otro' CHECK (tipo IN ('comida', 'bebida', 'otro')),
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_select" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "categorias_insert" ON public.categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "categorias_update" ON public.categorias FOR UPDATE USING (true);
CREATE POLICY "categorias_delete" ON public.categorias FOR DELETE USING (true);
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Subcategorías ═══
CREATE TABLE public.subcategorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subcategorias_select" ON public.subcategorias FOR SELECT USING (true);
CREATE POLICY "subcategorias_insert" ON public.subcategorias FOR INSERT WITH CHECK (true);
CREATE POLICY "subcategorias_update" ON public.subcategorias FOR UPDATE USING (true);
CREATE POLICY "subcategorias_delete" ON public.subcategorias FOR DELETE USING (true);

-- ═══ Albaranes ═══
CREATE TABLE public.albaranes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  numero TEXT DEFAULT '',
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT DEFAULT '',
  importe NUMERIC(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('procesado','pendiente','pendiente_verificacion','procesando','rechazado','revisar','error')),
  imagen_url TEXT,
  texto_ocr TEXT DEFAULT '',
  datos_ia JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.albaranes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albaranes_select" ON public.albaranes FOR SELECT USING (true);
CREATE POLICY "albaranes_insert" ON public.albaranes FOR INSERT WITH CHECK (true);
CREATE POLICY "albaranes_update" ON public.albaranes FOR UPDATE USING (true);
CREATE POLICY "albaranes_delete" ON public.albaranes FOR DELETE USING (true);
CREATE TRIGGER update_albaranes_updated_at BEFORE UPDATE ON public.albaranes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Categorías por albarán ═══
CREATE TABLE public.albaran_categorias (
  albaran_id UUID NOT NULL REFERENCES public.albaranes(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  importe NUMERIC(12,2) DEFAULT 0,
  PRIMARY KEY (albaran_id, categoria_id)
);
ALTER TABLE public.albaran_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albaran_categorias_select" ON public.albaran_categorias FOR SELECT USING (true);
CREATE POLICY "albaran_categorias_insert" ON public.albaran_categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "albaran_categorias_delete" ON public.albaran_categorias FOR DELETE USING (true);

-- ═══ Líneas de albarán ═══
CREATE TABLE public.lineas_albaran (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  albaran_id UUID NOT NULL REFERENCES public.albaranes(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,3) DEFAULT 1,
  precio_unitario NUMERIC(10,4) DEFAULT 0,
  importe NUMERIC(12,2) DEFAULT 0,
  iva_pct NUMERIC(5,2) DEFAULT 0,
  descuento_pct NUMERIC(5,2) DEFAULT 0,
  descuento_tipo TEXT DEFAULT '%',
  codigo TEXT DEFAULT '',
  subcategoria_id UUID REFERENCES public.subcategorias(id) ON DELETE SET NULL
);
ALTER TABLE public.lineas_albaran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineas_albaran_select" ON public.lineas_albaran FOR SELECT USING (true);
CREATE POLICY "lineas_albaran_insert" ON public.lineas_albaran FOR INSERT WITH CHECK (true);
CREATE POLICY "lineas_albaran_update" ON public.lineas_albaran FOR UPDATE USING (true);
CREATE POLICY "lineas_albaran_delete" ON public.lineas_albaran FOR DELETE USING (true);

-- ═══ Productos ═══
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombre_normalizado TEXT NOT NULL,
  referencia TEXT DEFAULT '',
  subcategoria_id UUID REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  unidad TEXT DEFAULT 'ud',
  precio_actual NUMERIC(10,4) DEFAULT 0,
  precio_anterior NUMERIC(10,4) DEFAULT 0,
  ultima_compra DATE,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT DEFAULT '',
  num_compras INTEGER DEFAULT 0,
  contenido_neto NUMERIC(10,3),
  contenido_unidad TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "productos_select" ON public.productos FOR SELECT USING (true);
CREATE POLICY "productos_insert" ON public.productos FOR INSERT WITH CHECK (true);
CREATE POLICY "productos_update" ON public.productos FOR UPDATE USING (true);
CREATE POLICY "productos_delete" ON public.productos FOR DELETE USING (true);
CREATE INDEX idx_productos_nombre ON public.productos(nombre_normalizado);
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Precios históricos ═══
CREATE TABLE public.precios_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  precio NUMERIC(10,4) NOT NULL,
  fecha DATE NOT NULL,
  albaran_id UUID REFERENCES public.albaranes(id) ON DELETE SET NULL,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT DEFAULT '',
  cantidad NUMERIC(10,3) DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.precios_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "precios_historico_select" ON public.precios_historico FOR SELECT USING (true);
CREATE POLICY "precios_historico_insert" ON public.precios_historico FOR INSERT WITH CHECK (true);
CREATE INDEX idx_precios_producto ON public.precios_historico(producto_id, fecha);

-- ═══ Alertas de precio ═══
CREATE TABLE public.alertas_precio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  precio_anterior NUMERIC(10,4),
  precio_nuevo NUMERIC(10,4),
  variacion_pct NUMERIC(6,2),
  albaran_id UUID REFERENCES public.albaranes(id) ON DELETE SET NULL,
  leida BOOLEAN DEFAULT false,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alertas_precio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_precio_select" ON public.alertas_precio FOR SELECT USING (true);
CREATE POLICY "alertas_precio_update" ON public.alertas_precio FOR UPDATE USING (true);
CREATE INDEX idx_alertas_leida ON public.alertas_precio(leida, fecha);

-- ═══ Familias (carta) ═══
CREATE TABLE public.familias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  icon TEXT DEFAULT '🍽️',
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.familias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "familias_select" ON public.familias FOR SELECT USING (true);
CREATE POLICY "familias_insert" ON public.familias FOR INSERT WITH CHECK (true);
CREATE POLICY "familias_update" ON public.familias FOR UPDATE USING (true);
CREATE POLICY "familias_delete" ON public.familias FOR DELETE USING (true);
CREATE TRIGGER update_familias_updated_at BEFORE UPDATE ON public.familias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Platos / Elaboraciones ═══
CREATE TABLE public.platos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  familia_id UUID REFERENCES public.familias(id) ON DELETE SET NULL,
  pvp NUMERIC(10,2) DEFAULT 0,
  coste NUMERIC(10,4) DEFAULT 0,
  margen_pct NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platos_select" ON public.platos FOR SELECT USING (true);
CREATE POLICY "platos_insert" ON public.platos FOR INSERT WITH CHECK (true);
CREATE POLICY "platos_update" ON public.platos FOR UPDATE USING (true);
CREATE POLICY "platos_delete" ON public.platos FOR DELETE USING (true);
CREATE TRIGGER update_platos_updated_at BEFORE UPDATE ON public.platos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Ingredientes de platos ═══
CREATE TABLE public.plato_ingredientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plato_id UUID NOT NULL REFERENCES public.platos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  producto_nombre TEXT NOT NULL,
  cantidad NUMERIC(10,3) DEFAULT 0,
  unidad TEXT DEFAULT 'ud',
  coste NUMERIC(10,4) DEFAULT 0
);
ALTER TABLE public.plato_ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plato_ingredientes_select" ON public.plato_ingredientes FOR SELECT USING (true);
CREATE POLICY "plato_ingredientes_insert" ON public.plato_ingredientes FOR INSERT WITH CHECK (true);
CREATE POLICY "plato_ingredientes_update" ON public.plato_ingredientes FOR UPDATE USING (true);
CREATE POLICY "plato_ingredientes_delete" ON public.plato_ingredientes FOR DELETE USING (true);

-- ═══ Arqueos Z ═══
CREATE TABLE public.arqueos_z (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  total_sin_iva NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.arqueos_z ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arqueos_z_select" ON public.arqueos_z FOR SELECT USING (true);
CREATE POLICY "arqueos_z_insert" ON public.arqueos_z FOR INSERT WITH CHECK (true);
CREATE POLICY "arqueos_z_update" ON public.arqueos_z FOR UPDATE USING (true);
CREATE POLICY "arqueos_z_delete" ON public.arqueos_z FOR DELETE USING (true);

-- ═══ Líneas de Arqueo Z (por familia) ═══
CREATE TABLE public.arqueo_familias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arqueo_id UUID NOT NULL REFERENCES public.arqueos_z(id) ON DELETE CASCADE,
  familia_nombre TEXT NOT NULL,
  importe NUMERIC(12,2) DEFAULT 0,
  unidades INTEGER DEFAULT 0
);
ALTER TABLE public.arqueo_familias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arqueo_familias_select" ON public.arqueo_familias FOR SELECT USING (true);
CREATE POLICY "arqueo_familias_insert" ON public.arqueo_familias FOR INSERT WITH CHECK (true);

-- ═══ Personal ═══
CREATE TABLE public.personal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dni TEXT,
  coste_mensual NUMERIC(10,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personal_select" ON public.personal FOR SELECT USING (true);
CREATE POLICY "personal_insert" ON public.personal FOR INSERT WITH CHECK (true);
CREATE POLICY "personal_update" ON public.personal FOR UPDATE USING (true);
CREATE POLICY "personal_delete" ON public.personal FOR DELETE USING (true);
CREATE TRIGGER update_personal_updated_at BEFORE UPDATE ON public.personal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Alquiler ═══
CREATE TABLE public.alquiler (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto TEXT NOT NULL,
  importe_mensual NUMERIC(10,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alquiler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alquiler_select" ON public.alquiler FOR SELECT USING (true);
CREATE POLICY "alquiler_insert" ON public.alquiler FOR INSERT WITH CHECK (true);
CREATE POLICY "alquiler_update" ON public.alquiler FOR UPDATE USING (true);
CREATE POLICY "alquiler_delete" ON public.alquiler FOR DELETE USING (true);
CREATE TRIGGER update_alquiler_updated_at BEFORE UPDATE ON public.alquiler FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Bancos ═══
CREATE TABLE public.bancos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto TEXT NOT NULL,
  importe_mensual NUMERIC(10,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bancos_select" ON public.bancos FOR SELECT USING (true);
CREATE POLICY "bancos_insert" ON public.bancos FOR INSERT WITH CHECK (true);
CREATE POLICY "bancos_update" ON public.bancos FOR UPDATE USING (true);
CREATE POLICY "bancos_delete" ON public.bancos FOR DELETE USING (true);
CREATE TRIGGER update_bancos_updated_at BEFORE UPDATE ON public.bancos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Suministros ═══
CREATE TABLE public.suministros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto TEXT NOT NULL,
  tipo TEXT DEFAULT 'otro' CHECK (tipo IN ('agua','luz','gas','telefono','internet','otro')),
  importe NUMERIC(10,2) DEFAULT 0,
  mes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suministros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suministros_select" ON public.suministros FOR SELECT USING (true);
CREATE POLICY "suministros_insert" ON public.suministros FOR INSERT WITH CHECK (true);
CREATE POLICY "suministros_update" ON public.suministros FOR UPDATE USING (true);
CREATE POLICY "suministros_delete" ON public.suministros FOR DELETE USING (true);

-- ═══ Ajustes ═══
CREATE TABLE public.ajustes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  valor TEXT DEFAULT ''
);
ALTER TABLE public.ajustes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ajustes_select" ON public.ajustes FOR SELECT USING (true);
CREATE POLICY "ajustes_insert" ON public.ajustes FOR INSERT WITH CHECK (true);
CREATE POLICY "ajustes_update" ON public.ajustes FOR UPDATE USING (true);

-- ═══ Facturas email ═══
CREATE TABLE public.facturas_email (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_subject TEXT DEFAULT '',
  email_from TEXT DEFAULT '',
  email_date TEXT DEFAULT '',
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT DEFAULT '',
  numero_factura TEXT DEFAULT '',
  fecha_factura DATE,
  base_imponible NUMERIC(12,2) DEFAULT 0,
  iva_pct NUMERIC(5,2) DEFAULT 0,
  iva_importe NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  pdf_url TEXT,
  datos_ia JSONB DEFAULT '{}',
  matching_status TEXT DEFAULT 'sin_revisar',
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.facturas_email ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facturas_email_select" ON public.facturas_email FOR SELECT USING (true);
CREATE POLICY "facturas_email_insert" ON public.facturas_email FOR INSERT WITH CHECK (true);
CREATE POLICY "facturas_email_update" ON public.facturas_email FOR UPDATE USING (true);
CREATE POLICY "facturas_email_delete" ON public.facturas_email FOR DELETE USING (true);
CREATE INDEX idx_facturas_email_estado ON public.facturas_email(estado);
CREATE INDEX idx_facturas_email_proveedor ON public.facturas_email(proveedor_id);
CREATE TRIGGER update_facturas_email_updated_at BEFORE UPDATE ON public.facturas_email FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Factura-Albarán matching ═══
CREATE TABLE public.factura_albaran_match (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID NOT NULL REFERENCES public.facturas_email(id) ON DELETE CASCADE,
  albaran_id UUID NOT NULL REFERENCES public.albaranes(id) ON DELETE CASCADE,
  importe_factura NUMERIC(12,2) DEFAULT 0,
  importe_albaran NUMERIC(12,2) DEFAULT 0,
  diferencia NUMERIC(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.factura_albaran_match ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factura_albaran_match_select" ON public.factura_albaran_match FOR SELECT USING (true);
CREATE POLICY "factura_albaran_match_insert" ON public.factura_albaran_match FOR INSERT WITH CHECK (true);
CREATE POLICY "factura_albaran_match_update" ON public.factura_albaran_match FOR UPDATE USING (true);

-- ═══ Storage para imágenes de albaranes ═══
INSERT INTO storage.buckets (id, name, public) VALUES ('albaranes', 'albaranes', true);
CREATE POLICY "albaranes_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'albaranes');
CREATE POLICY "albaranes_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'albaranes');
CREATE POLICY "albaranes_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'albaranes');
