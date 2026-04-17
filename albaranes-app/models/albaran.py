from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class Albaran(BaseModel):
    model_config = ConfigDict(extra="allow")
    numero: Optional[str] = None
    fecha: Optional[str] = None
    serie: Optional[str] = None


class Proveedor(BaseModel):
    model_config = ConfigDict(extra="allow")
    nombre: Optional[str] = None
    cif_nif: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    poblacion: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None


class Cliente(BaseModel):
    model_config = ConfigDict(extra="allow")
    nombre: Optional[str] = None
    cif_nif: Optional[str] = None
    codigo_cliente: Optional[str] = None
    direccion_facturacion: Optional[str] = None
    direccion_entrega: Optional[str] = None


class Pedido(BaseModel):
    model_config = ConfigDict(extra="allow")
    numero_pedido: Optional[str] = None
    referencia_cliente: Optional[str] = None


class Linea(BaseModel):
    model_config = ConfigDict(extra="allow")
    posicion: int = 0
    tipo_linea: Literal["producto", "envase", "transporte", "servicio"] = "producto"
    referencia: Optional[str] = None
    descripcion: str = ""
    cantidad: float = 0.0
    unidad: Optional[str] = None
    precio_unitario: float = 0.0
    descuento_pct: float = 0.0
    importe_linea: float = 0.0
    iva_pct: float = 0


class DesgloseIva(BaseModel):
    model_config = ConfigDict(extra="allow")
    iva_pct: float = 0
    base: float = 0.0
    importe_iva: float = 0.0


class Totales(BaseModel):
    model_config = ConfigDict(extra="allow")
    importe_bruto: float = 0.0
    descuento_global: float = 0.0
    base_imponible: float = 0.0
    iva_importe: float = 0.0
    total: float = 0.0


class MaterialPendiente(BaseModel):
    model_config = ConfigDict(extra="allow")
    referencia: Optional[str] = None
    descripcion: str = ""
    cantidad: float = 0.0
    unidad: Optional[str] = None


class Verificaciones(BaseModel):
    model_config = ConfigDict(extra="allow")
    lineas_cuadran: bool = True
    totales_cuadran: bool = True
    precios_con_iva_incluido: bool = False
    multi_iva: bool = False


class CampoDudoso(BaseModel):
    model_config = ConfigDict(extra="allow")
    campo: str
    valor_elegido: Optional[str] = None
    alternativa: Optional[str] = None
    motivo: Optional[str] = None


class Confianza(BaseModel):
    model_config = ConfigDict(extra="allow")
    global_: Literal["alta", "media", "baja"] = Field(default="media", alias="global")
    puntuacion_0_100: int = 0
    campos_dudosos: List[CampoDudoso] = Field(default_factory=list)


class AlbaranExtraido(BaseModel):
    """Full extracted albaran structure. Matches the prompt schema."""

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    pagina_ilegible: bool = False
    motivo: Optional[str] = None
    albaran: Optional[Albaran] = None
    proveedor: Optional[Proveedor] = None
    cliente: Optional[Cliente] = None
    pedido: Optional[Pedido] = None
    lineas: List[Linea] = Field(default_factory=list)
    desglose_iva: List[DesgloseIva] = Field(default_factory=list)
    totales: Optional[Totales] = None
    forma_pago: Optional[str] = None
    observaciones_albaran: Optional[str] = None
    observaciones_sistema: Optional[str] = None
    material_pendiente: List[MaterialPendiente] = Field(default_factory=list)
    verificaciones: Optional[Verificaciones] = None
    confianza: Optional[Confianza] = None


def clasificar_pila(data: dict) -> str:
    """Return 'listos', 'revisar', or 'problemas' given an extracted JSON."""
    if data.get("pagina_ilegible"):
        return "problemas"
    conf = (data.get("confianza") or {}).get("global", "media")
    if conf == "alta":
        return "listos"
    return "revisar"
