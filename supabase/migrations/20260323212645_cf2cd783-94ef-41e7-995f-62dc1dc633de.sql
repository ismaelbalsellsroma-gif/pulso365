
-- Ampliar tabla personal con campos para turnos y fichaje
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS apellidos text DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefono text DEFAULT '',
  ADD COLUMN IF NOT EXISTS puesto text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_contrato text DEFAULT 'indefinido',
  ADD COLUMN IF NOT EXISTS horas_contrato numeric DEFAULT 40,
  ADD COLUMN IF NOT EXISTS salario_bruto_mensual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coste_empresa_mensual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coste_hora numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_alta date,
  ADD COLUMN IF NOT EXISTS fecha_baja date,
  ADD COLUMN IF NOT EXISTS foto_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notas text DEFAULT '';

-- Plantillas de turno
CREATE TABLE IF NOT EXISTS public.plantillas_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  hora_inicio text NOT NULL,
  hora_fin text NOT NULL,
  pausa_minutos integer DEFAULT 0,
  color text DEFAULT '#01696F',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.plantillas_turno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plantillas_turno_select" ON public.plantillas_turno FOR SELECT USING (true);
CREATE POLICY "plantillas_turno_insert" ON public.plantillas_turno FOR INSERT WITH CHECK (true);
CREATE POLICY "plantillas_turno_update" ON public.plantillas_turno FOR UPDATE USING (true);
CREATE POLICY "plantillas_turno_delete" ON public.plantillas_turno FOR DELETE USING (true);

-- Turnos planificados
CREATE TABLE IF NOT EXISTS public.turnos_planificados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_inicio text NOT NULL,
  hora_fin text NOT NULL,
  pausa_minutos integer DEFAULT 0,
  puesto text DEFAULT '',
  notas text DEFAULT '',
  color text DEFAULT '#01696F',
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id, fecha, hora_inicio)
);
ALTER TABLE public.turnos_planificados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turnos_planificados_select" ON public.turnos_planificados FOR SELECT USING (true);
CREATE POLICY "turnos_planificados_insert" ON public.turnos_planificados FOR INSERT WITH CHECK (true);
CREATE POLICY "turnos_planificados_update" ON public.turnos_planificados FOR UPDATE USING (true);
CREATE POLICY "turnos_planificados_delete" ON public.turnos_planificados FOR DELETE USING (true);

-- Fichajes
CREATE TABLE IF NOT EXISTS public.fichajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada text,
  hora_salida text,
  horas_trabajadas numeric DEFAULT 0,
  horas_extra numeric DEFAULT 0,
  tipo text DEFAULT 'normal',
  origen text DEFAULT 'manual',
  latitud numeric,
  longitud numeric,
  notas text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.fichajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fichajes_select" ON public.fichajes FOR SELECT USING (true);
CREATE POLICY "fichajes_insert" ON public.fichajes FOR INSERT WITH CHECK (true);
CREATE POLICY "fichajes_update" ON public.fichajes FOR UPDATE USING (true);
CREATE POLICY "fichajes_delete" ON public.fichajes FOR DELETE USING (true);

-- Ausencias
CREATE TABLE IF NOT EXISTS public.ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  tipo text NOT NULL DEFAULT 'vacaciones',
  estado text DEFAULT 'aprobada',
  notas text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ausencias_select" ON public.ausencias FOR SELECT USING (true);
CREATE POLICY "ausencias_insert" ON public.ausencias FOR INSERT WITH CHECK (true);
CREATE POLICY "ausencias_update" ON public.ausencias FOR UPDATE USING (true);
CREATE POLICY "ausencias_delete" ON public.ausencias FOR DELETE USING (true);

-- Insertar plantillas por defecto
INSERT INTO public.plantillas_turno (nombre, hora_inicio, hora_fin, pausa_minutos, color) VALUES
  ('Mañana', '08:00', '16:00', 30, '#3B82F6'),
  ('Tarde', '16:00', '00:00', 30, '#F97316'),
  ('Noche', '00:00', '08:00', 30, '#8B5CF6'),
  ('Partido', '10:00', '16:00', 0, '#10B981'),
  ('Turno completo', '09:00', '17:00', 30, '#01696F');
