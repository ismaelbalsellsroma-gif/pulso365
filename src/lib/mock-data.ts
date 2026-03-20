// Mock data for Albarán360 — replaces API calls until backend is connected

export interface Proveedor {
  id: number;
  nombre: string;
  tipos: string[];
  contacto: string;
  telefono: string;
  email: string;
  cif: string;
  total_compras: number;
  num_albaranes: number;
}

export interface Albaran {
  id: number;
  fecha: string;
  numero: string;
  proveedor_nombre: string;
  proveedor_id: number;
  importe: number;
  estado: 'procesado' | 'pendiente' | 'pendiente_verificacion' | 'procesando' | 'rechazado' | 'revisar' | 'error';
  categorias: string[];
  tiene_imagen: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  icon: string;
  tipo: 'comida' | 'bebida' | 'otro';
  subcategorias: { id: number; nombre: string }[];
  total_productos: number;
}

export interface Producto {
  id: number;
  nombre: string;
  referencia: string;
  categoria_nombre: string;
  categoria_icon: string;
  proveedor_nombre: string;
  precio_actual: number;
  precio_anterior: number;
  ultima_compra: string;
  num_compras: number;
  unidad: string;
}

export interface FamiliaCarta {
  id: number;
  nombre: string;
  icon: string;
  num_platos: number;
  ventas_mes: number;
}

export interface PlatoElaboracion {
  id: number;
  nombre: string;
  familia_id: number;
  familia_nombre: string;
  pvp: number;
  coste: number;
  margen_pct: number;
  ingredientes: { producto_nombre: string; cantidad: number; unidad: string; coste: number }[];
}

export interface ArqueoZ {
  id: number;
  fecha: string;
  total_sin_iva: number;
  familias: { nombre: string; importe: number; unidades: number }[];
}

export interface DashboardData {
  ventas: number;
  compras: { total: number; pct: number; bebida: number; bebida_pct: number; comida: number; comida_pct: number; otros: number; otros_pct: number };
  personal: { total: number; pct: number };
  alquiler: { total: number; pct: number };
  bancos: { total: number; pct: number };
  suministros: { total: number; pct: number; mes_referencia: string };
  resultado: number;
  resultado_pct: number;
  prorrateado: boolean;
  dia_actual: number;
  dias_mes: number;
}

export const mockDashboard: DashboardData = {
  ventas: 42850,
  compras: { total: 14997.5, pct: 35, bebida: 5998.5, bebida_pct: 14, comida: 7713, comida_pct: 18, otros: 1286, otros_pct: 3 },
  personal: { total: 10712.5, pct: 25 },
  alquiler: { total: 3000, pct: 7 },
  bancos: { total: 857, pct: 2 },
  suministros: { total: 1714, pct: 4, mes_referencia: '2026-02' },
  resultado: 11569,
  resultado_pct: 27,
  prorrateado: true,
  dia_actual: 20,
  dias_mes: 31,
};

export const mockProveedores: Proveedor[] = [
  { id: 1, nombre: 'Distribuciones García', tipos: ['alimentacion', 'bebida'], contacto: 'Manuel García', telefono: '612 345 678', email: 'pedidos@dgarcia.es', cif: 'B12345678', total_compras: 4850.30, num_albaranes: 12 },
  { id: 2, nombre: 'Pescados Atlántico', tipos: ['alimentacion'], contacto: 'Ana Martín', telefono: '698 765 432', email: 'ana@pescadosatlantico.com', cif: 'B87654321', total_compras: 3210.75, num_albaranes: 8 },
  { id: 3, nombre: 'Bodegas del Sur', tipos: ['bebida'], contacto: 'Carlos Ruiz', telefono: '654 321 987', email: 'carlos@bodegasdelsur.es', cif: 'A11223344', total_compras: 5998.50, num_albaranes: 6 },
  { id: 4, nombre: 'Limpieza Industrial López', tipos: ['limpieza'], contacto: 'Rosa López', telefono: '611 222 333', email: 'rosa@limpiezalopez.com', cif: 'B55667788', total_compras: 856.20, num_albaranes: 3 },
  { id: 5, nombre: 'Cárnicas Premium', tipos: ['alimentacion'], contacto: 'Pedro Sánchez', telefono: '677 888 999', email: 'pedidos@carnicaspremium.es', cif: 'B99887766', total_compras: 2740.00, num_albaranes: 7 },
];

export const mockAlbaranes: Albaran[] = [
  { id: 1, fecha: '2026-03-19', numero: 'A-2026-0147', proveedor_nombre: 'Distribuciones García', proveedor_id: 1, importe: 487.30, estado: 'procesado', categorias: ['Bebida', 'Alimentación'], tiene_imagen: true },
  { id: 2, fecha: '2026-03-18', numero: 'PA-1204', proveedor_nombre: 'Pescados Atlántico', proveedor_id: 2, importe: 312.75, estado: 'procesado', categorias: ['Alimentación'], tiene_imagen: true },
  { id: 3, fecha: '2026-03-18', numero: 'BS-0089', proveedor_nombre: 'Bodegas del Sur', proveedor_id: 3, importe: 1250.00, estado: 'pendiente_verificacion', categorias: ['Bebida'], tiene_imagen: true },
  { id: 4, fecha: '2026-03-17', numero: 'CP-456', proveedor_nombre: 'Cárnicas Premium', proveedor_id: 5, importe: 645.20, estado: 'procesado', categorias: ['Alimentación'], tiene_imagen: false },
  { id: 5, fecha: '2026-03-16', numero: '', proveedor_nombre: 'Limpieza Industrial López', proveedor_id: 4, importe: 123.40, estado: 'pendiente', categorias: ['Limpieza'], tiene_imagen: true },
  { id: 6, fecha: '2026-03-15', numero: 'A-2026-0142', proveedor_nombre: 'Distribuciones García', proveedor_id: 1, importe: 398.10, estado: 'procesado', categorias: ['Alimentación'], tiene_imagen: true },
];

export const mockCategorias: Categoria[] = [
  { id: 1, nombre: 'Bebida Alcohólica', icon: '🍷', tipo: 'bebida', subcategorias: [{ id: 1, nombre: 'Vinos' }, { id: 2, nombre: 'Cerveza' }, { id: 3, nombre: 'Destilados' }], total_productos: 34 },
  { id: 2, nombre: 'Bebida Sin Alcohol', icon: '🥤', tipo: 'bebida', subcategorias: [{ id: 4, nombre: 'Refrescos' }, { id: 5, nombre: 'Agua' }, { id: 6, nombre: 'Zumos' }], total_productos: 18 },
  { id: 3, nombre: 'Carnes', icon: '🥩', tipo: 'comida', subcategorias: [{ id: 7, nombre: 'Ternera' }, { id: 8, nombre: 'Cerdo' }, { id: 9, nombre: 'Aves' }], total_productos: 22 },
  { id: 4, nombre: 'Pescados y Mariscos', icon: '🐟', tipo: 'comida', subcategorias: [{ id: 10, nombre: 'Pescado fresco' }, { id: 11, nombre: 'Marisco' }, { id: 12, nombre: 'Congelado' }], total_productos: 15 },
  { id: 5, nombre: 'Frutas y Verduras', icon: '🥬', tipo: 'comida', subcategorias: [{ id: 13, nombre: 'Fruta' }, { id: 14, nombre: 'Verdura' }, { id: 15, nombre: 'Setas' }], total_productos: 28 },
  { id: 6, nombre: 'Lácteos y Huevos', icon: '🧀', tipo: 'comida', subcategorias: [{ id: 16, nombre: 'Quesos' }, { id: 17, nombre: 'Lácteos' }, { id: 18, nombre: 'Huevos' }], total_productos: 12 },
  { id: 7, nombre: 'Limpieza', icon: '🧹', tipo: 'otro', subcategorias: [{ id: 19, nombre: 'Productos' }, { id: 20, nombre: 'Desechables' }], total_productos: 8 },
];

export const mockProductos: Producto[] = [
  { id: 1, nombre: 'Solomillo de ternera', referencia: 'CAR-001', categoria_nombre: 'Carnes', categoria_icon: '🥩', proveedor_nombre: 'Cárnicas Premium', precio_actual: 24.80, precio_anterior: 22.50, ultima_compra: '2026-03-17', num_compras: 14, unidad: 'kg' },
  { id: 2, nombre: 'Lubina fresca', referencia: 'PES-003', categoria_nombre: 'Pescados y Mariscos', categoria_icon: '🐟', proveedor_nombre: 'Pescados Atlántico', precio_actual: 18.90, precio_anterior: 19.20, ultima_compra: '2026-03-18', num_compras: 9, unidad: 'kg' },
  { id: 3, nombre: 'Rioja Crianza 2022', referencia: 'VIN-012', categoria_nombre: 'Bebida Alcohólica', categoria_icon: '🍷', proveedor_nombre: 'Bodegas del Sur', precio_actual: 6.40, precio_anterior: 6.40, ultima_compra: '2026-03-18', num_compras: 22, unidad: 'ud' },
  { id: 4, nombre: 'Lechuga romana', referencia: 'VER-007', categoria_nombre: 'Frutas y Verduras', categoria_icon: '🥬', proveedor_nombre: 'Distribuciones García', precio_actual: 1.20, precio_anterior: 0.95, ultima_compra: '2026-03-19', num_compras: 31, unidad: 'ud' },
  { id: 5, nombre: 'Queso manchego curado', referencia: 'LAC-004', categoria_nombre: 'Lácteos y Huevos', categoria_icon: '🧀', proveedor_nombre: 'Distribuciones García', precio_actual: 14.50, precio_anterior: 13.80, ultima_compra: '2026-03-19', num_compras: 8, unidad: 'kg' },
  { id: 6, nombre: 'Coca-Cola 33cl', referencia: 'REF-001', categoria_nombre: 'Bebida Sin Alcohol', categoria_icon: '🥤', proveedor_nombre: 'Distribuciones García', precio_actual: 0.42, precio_anterior: 0.40, ultima_compra: '2026-03-19', num_compras: 45, unidad: 'ud' },
];

export const mockFamilias: FamiliaCarta[] = [
  { id: 1, nombre: 'Entrantes', icon: '🥗', num_platos: 8, ventas_mes: 4280 },
  { id: 2, nombre: 'Carnes', icon: '🥩', num_platos: 6, ventas_mes: 8560 },
  { id: 3, nombre: 'Pescados', icon: '🐟', num_platos: 5, ventas_mes: 6420 },
  { id: 4, nombre: 'Postres', icon: '🍰', num_platos: 4, ventas_mes: 2140 },
  { id: 5, nombre: 'Bebidas', icon: '🍷', num_platos: 12, ventas_mes: 12850 },
  { id: 6, nombre: 'Cafetería', icon: '☕', num_platos: 6, ventas_mes: 3210 },
];

export const mockArqueos: ArqueoZ[] = [
  { id: 1, fecha: '2026-03-19', total_sin_iva: 2847.30, familias: [{ nombre: 'Entrantes', importe: 320, unidades: 18 }, { nombre: 'Carnes', importe: 640, unidades: 12 }, { nombre: 'Pescados', importe: 480, unidades: 9 }, { nombre: 'Postres', importe: 127.30, unidades: 11 }, { nombre: 'Bebidas', importe: 980, unidades: 54 }, { nombre: 'Cafetería', importe: 300, unidades: 42 }] },
  { id: 2, fecha: '2026-03-18', total_sin_iva: 3102.50, familias: [{ nombre: 'Entrantes', importe: 380, unidades: 22 }, { nombre: 'Carnes', importe: 720, unidades: 14 }, { nombre: 'Pescados', importe: 520, unidades: 10 }, { nombre: 'Postres', importe: 142.50, unidades: 13 }, { nombre: 'Bebidas', importe: 1040, unidades: 58 }, { nombre: 'Cafetería', importe: 300, unidades: 38 }] },
];

export function fmt(n: number): string {
  return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
