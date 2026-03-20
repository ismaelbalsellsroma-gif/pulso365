import { supabase } from '@/integrations/supabase/client';

export function fmt(n: number | null | undefined): string {
  return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export async function fetchProveedores() {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function fetchCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*, subcategorias(*)')
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function fetchAlbaranes() {
  const { data, error } = await supabase
    .from('albaranes')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchFamilias() {
  const { data, error } = await supabase
    .from('familias')
    .select('*')
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchArqueos() {
  const { data, error } = await supabase
    .from('arqueos_z')
    .select('*, arqueo_familias(*)')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchPersonal() {
  const { data, error } = await supabase
    .from('personal')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function fetchAlquiler() {
  const { data, error } = await supabase
    .from('alquiler')
    .select('*')
    .order('concepto');
  if (error) throw error;
  return data;
}

export async function fetchBancos() {
  const { data, error } = await supabase
    .from('bancos')
    .select('*')
    .order('concepto');
  if (error) throw error;
  return data;
}

export async function fetchSuministros(mes?: string) {
  let q = supabase.from('suministros').select('*').order('concepto');
  if (mes) q = q.eq('mes', mes);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchAjustes() {
  const { data, error } = await supabase
    .from('ajustes')
    .select('*');
  if (error) throw error;
  return data;
}
