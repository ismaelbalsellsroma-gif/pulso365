
-- Add escandallo fields to platos
ALTER TABLE public.platos ADD COLUMN IF NOT EXISTS descripcion text DEFAULT '';
ALTER TABLE public.platos ADD COLUMN IF NOT EXISTS iva_porcentaje numeric DEFAULT 10;
ALTER TABLE public.platos ADD COLUMN IF NOT EXISTS foto_url text DEFAULT '';

-- Add merma and notas to plato_ingredientes
ALTER TABLE public.plato_ingredientes ADD COLUMN IF NOT EXISTS merma_porcentaje numeric DEFAULT 0;
ALTER TABLE public.plato_ingredientes ADD COLUMN IF NOT EXISTS notas text DEFAULT '';
