ALTER TABLE public.lineas_albaran DROP CONSTRAINT lineas_albaran_albaran_id_fkey;
ALTER TABLE public.lineas_albaran ADD CONSTRAINT lineas_albaran_albaran_id_fkey FOREIGN KEY (albaran_id) REFERENCES public.albaranes(id) ON DELETE CASCADE;

ALTER TABLE public.precios_historico DROP CONSTRAINT precios_historico_albaran_id_fkey;
ALTER TABLE public.precios_historico ADD CONSTRAINT precios_historico_albaran_id_fkey FOREIGN KEY (albaran_id) REFERENCES public.albaranes(id) ON DELETE SET NULL;

ALTER TABLE public.alertas_precio DROP CONSTRAINT alertas_precio_albaran_id_fkey;
ALTER TABLE public.alertas_precio ADD CONSTRAINT alertas_precio_albaran_id_fkey FOREIGN KEY (albaran_id) REFERENCES public.albaranes(id) ON DELETE SET NULL;

ALTER TABLE public.albaran_categorias DROP CONSTRAINT albaran_categorias_albaran_id_fkey;
ALTER TABLE public.albaran_categorias ADD CONSTRAINT albaran_categorias_albaran_id_fkey FOREIGN KEY (albaran_id) REFERENCES public.albaranes(id) ON DELETE CASCADE;

ALTER TABLE public.factura_albaran_match DROP CONSTRAINT factura_albaran_match_albaran_id_fkey;
ALTER TABLE public.factura_albaran_match ADD CONSTRAINT factura_albaran_match_albaran_id_fkey FOREIGN KEY (albaran_id) REFERENCES public.albaranes(id) ON DELETE CASCADE;