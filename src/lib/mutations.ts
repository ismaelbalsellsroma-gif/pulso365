import { supabase } from '@/integrations/supabase/client';

// ─── Proveedores ───
export async function upsertProveedor(data: {
  id?: string;
  nombre: string;
  cif?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  tipos?: string[];
}) {
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from('proveedores').update(rest).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('proveedores').insert(rest);
    if (error) throw error;
  }
}

export async function deleteProveedor(id: string) {
  const { error } = await supabase.from('proveedores').delete().eq('id', id);
  if (error) throw error;
}

// ─── Personal ───
export async function upsertPersonal(data: {
  id?: string;
  nombre: string;
  dni?: string;
  coste_mensual?: number;
  activo?: boolean;
}) {
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from('personal').update(rest).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('personal').insert(rest);
    if (error) throw error;
  }
}

export async function deletePersonal(id: string) {
  const { error } = await supabase.from('personal').delete().eq('id', id);
  if (error) throw error;
}

// ─── Alquiler ───
export async function upsertAlquiler(data: {
  id?: string;
  concepto: string;
  importe_mensual?: number;
  activo?: boolean;
}) {
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from('alquiler').update(rest).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('alquiler').insert(rest);
    if (error) throw error;
  }
}

export async function deleteAlquiler(id: string) {
  const { error } = await supabase.from('alquiler').delete().eq('id', id);
  if (error) throw error;
}

// ─── Bancos ───
export async function upsertBanco(data: {
  id?: string;
  concepto: string;
  importe_mensual?: number;
  activo?: boolean;
}) {
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from('bancos').update(rest).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('bancos').insert(rest);
    if (error) throw error;
  }
}

export async function deleteBanco(id: string) {
  const { error } = await supabase.from('bancos').delete().eq('id', id);
  if (error) throw error;
}

// ─── Suministros ───
export async function upsertSuministro(data: {
  id?: string;
  concepto: string;
  tipo?: string;
  mes: string;
  importe?: number;
}) {
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from('suministros').update(rest).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('suministros').insert(rest);
    if (error) throw error;
  }
}

export async function deleteSuministro(id: string) {
  const { error } = await supabase.from('suministros').delete().eq('id', id);
  if (error) throw error;
}
