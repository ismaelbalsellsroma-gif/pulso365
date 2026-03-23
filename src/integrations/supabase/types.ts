export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ajustes: {
        Row: {
          clave: string
          id: string
          valor: string | null
        }
        Insert: {
          clave: string
          id?: string
          valor?: string | null
        }
        Update: {
          clave?: string
          id?: string
          valor?: string | null
        }
        Relationships: []
      }
      albaran_categorias: {
        Row: {
          albaran_id: string
          categoria_id: string
          importe: number | null
        }
        Insert: {
          albaran_id: string
          categoria_id: string
          importe?: number | null
        }
        Update: {
          albaran_id?: string
          categoria_id?: string
          importe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albaran_categorias_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albaran_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      albaranes: {
        Row: {
          created_at: string
          datos_ia: Json | null
          estado: string | null
          fecha: string
          id: string
          imagen_url: string | null
          importe: number | null
          numero: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          texto_ocr: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          datos_ia?: Json | null
          estado?: string | null
          fecha?: string
          id?: string
          imagen_url?: string | null
          importe?: number | null
          numero?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          texto_ocr?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          datos_ia?: Json | null
          estado?: string | null
          fecha?: string
          id?: string
          imagen_url?: string | null
          importe?: number | null
          numero?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          texto_ocr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "albaranes_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_merma: {
        Row: {
          coste_perdida: number | null
          created_at: string | null
          desviacion_pct: number | null
          id: string
          leida: boolean | null
          mensaje: string | null
          periodo: string | null
          producto_id: string
          producto_nombre: string | null
          tipo: string
        }
        Insert: {
          coste_perdida?: number | null
          created_at?: string | null
          desviacion_pct?: number | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          periodo?: string | null
          producto_id: string
          producto_nombre?: string | null
          tipo: string
        }
        Update: {
          coste_perdida?: number | null
          created_at?: string | null
          desviacion_pct?: number | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          periodo?: string | null
          producto_id?: string
          producto_nombre?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_merma_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_precio: {
        Row: {
          albaran_id: string | null
          created_at: string
          fecha: string
          id: string
          leida: boolean | null
          mensaje: string
          precio_anterior: number | null
          precio_nuevo: number | null
          producto_id: string
          tipo: string
          variacion_pct: number | null
        }
        Insert: {
          albaran_id?: string | null
          created_at?: string
          fecha: string
          id?: string
          leida?: boolean | null
          mensaje: string
          precio_anterior?: number | null
          precio_nuevo?: number | null
          producto_id: string
          tipo: string
          variacion_pct?: number | null
        }
        Update: {
          albaran_id?: string | null
          created_at?: string
          fecha?: string
          id?: string
          leida?: boolean | null
          mensaje?: string
          precio_anterior?: number | null
          precio_nuevo?: number | null
          producto_id?: string
          tipo?: string
          variacion_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_precio_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_precio_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      alquiler: {
        Row: {
          activo: boolean | null
          concepto: string
          created_at: string
          id: string
          importe_mensual: number | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          concepto: string
          created_at?: string
          id?: string
          importe_mensual?: number | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          concepto?: string
          created_at?: string
          id?: string
          importe_mensual?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      aprendizaje: {
        Row: {
          created_at: string
          datos_antes: Json | null
          datos_despues: Json | null
          descripcion: string
          id: string
          proveedor_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          descripcion: string
          id?: string
          proveedor_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          descripcion?: string
          id?: string
          proveedor_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprendizaje_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      arqueo_familias: {
        Row: {
          arqueo_id: string
          familia_nombre: string
          id: string
          importe: number | null
          unidades: number | null
        }
        Insert: {
          arqueo_id: string
          familia_nombre: string
          id?: string
          importe?: number | null
          unidades?: number | null
        }
        Update: {
          arqueo_id?: string
          familia_nombre?: string
          id?: string
          importe?: number | null
          unidades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arqueo_familias_arqueo_id_fkey"
            columns: ["arqueo_id"]
            isOneToOne: false
            referencedRelation: "arqueos_z"
            referencedColumns: ["id"]
          },
        ]
      }
      arqueos_z: {
        Row: {
          created_at: string
          fecha: string
          id: string
          total_sin_iva: number | null
        }
        Insert: {
          created_at?: string
          fecha: string
          id?: string
          total_sin_iva?: number | null
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          total_sin_iva?: number | null
        }
        Relationships: []
      }
      ausencias: {
        Row: {
          created_at: string | null
          empleado_id: string
          estado: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          notas: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          empleado_id: string
          estado?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          notas?: string | null
          tipo?: string
        }
        Update: {
          created_at?: string | null
          empleado_id?: string
          estado?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          notas?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos: {
        Row: {
          activo: boolean | null
          concepto: string
          created_at: string
          id: string
          importe_mensual: number | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          concepto: string
          created_at?: string
          id?: string
          importe_mensual?: number | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          concepto?: string
          created_at?: string
          id?: string
          importe_mensual?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          nombre: string
          orden: number | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          nombre: string
          orden?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          nombre?: string
          orden?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cuentas_bancarias: {
        Row: {
          activa: boolean | null
          banco: string | null
          created_at: string | null
          iban: string | null
          id: string
          nombre: string
          saldo_actual: number | null
          ultima_actualizacion: string | null
        }
        Insert: {
          activa?: boolean | null
          banco?: string | null
          created_at?: string | null
          iban?: string | null
          id?: string
          nombre: string
          saldo_actual?: number | null
          ultima_actualizacion?: string | null
        }
        Update: {
          activa?: boolean | null
          banco?: string | null
          created_at?: string | null
          iban?: string | null
          id?: string
          nombre?: string
          saldo_actual?: number | null
          ultima_actualizacion?: string | null
        }
        Relationships: []
      }
      factura_albaran_match: {
        Row: {
          albaran_id: string
          created_at: string
          diferencia: number | null
          estado: string | null
          factura_id: string
          id: string
          importe_albaran: number | null
          importe_factura: number | null
        }
        Insert: {
          albaran_id: string
          created_at?: string
          diferencia?: number | null
          estado?: string | null
          factura_id: string
          id?: string
          importe_albaran?: number | null
          importe_factura?: number | null
        }
        Update: {
          albaran_id?: string
          created_at?: string
          diferencia?: number | null
          estado?: string | null
          factura_id?: string
          id?: string
          importe_albaran?: number | null
          importe_factura?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "factura_albaran_match_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_albaran_match_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_email"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_email: {
        Row: {
          base_imponible: number | null
          created_at: string
          datos_ia: Json | null
          email_date: string | null
          email_from: string | null
          email_subject: string | null
          estado: string | null
          fecha_factura: string | null
          id: string
          iva_importe: number | null
          iva_pct: number | null
          matching_status: string | null
          notas: string | null
          numero_factura: string | null
          pdf_url: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          base_imponible?: number | null
          created_at?: string
          datos_ia?: Json | null
          email_date?: string | null
          email_from?: string | null
          email_subject?: string | null
          estado?: string | null
          fecha_factura?: string | null
          id?: string
          iva_importe?: number | null
          iva_pct?: number | null
          matching_status?: string | null
          notas?: string | null
          numero_factura?: string | null
          pdf_url?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          base_imponible?: number | null
          created_at?: string
          datos_ia?: Json | null
          email_date?: string | null
          email_from?: string | null
          email_subject?: string | null
          estado?: string | null
          fecha_factura?: string | null
          id?: string
          iva_importe?: number | null
          iva_pct?: number | null
          matching_status?: string | null
          notas?: string | null
          numero_factura?: string | null
          pdf_url?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_email_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      familias: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          nombre: string
          orden: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          nombre: string
          orden?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          nombre?: string
          orden?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fichajes: {
        Row: {
          created_at: string | null
          empleado_id: string
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          horas_extra: number | null
          horas_trabajadas: number | null
          id: string
          latitud: number | null
          longitud: number | null
          notas: string | null
          origen: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          empleado_id: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          horas_extra?: number | null
          horas_trabajadas?: number | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          notas?: string | null
          origen?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          empleado_id?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          horas_extra?: number | null
          horas_trabajadas?: number | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          notas?: string | null
          origen?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichajes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_pvp_carta: {
        Row: {
          created_at: string | null
          id: string
          motivo: string | null
          plato_id: string
          pvp_anterior: number | null
          pvp_nuevo: number | null
          sugerencia_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          plato_id: string
          pvp_anterior?: number | null
          pvp_nuevo?: number | null
          sugerencia_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          plato_id?: string
          pvp_anterior?: number | null
          pvp_nuevo?: number | null
          sugerencia_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_pvp_carta_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_pvp_carta_sugerencia_id_fkey"
            columns: ["sugerencia_id"]
            isOneToOne: false
            referencedRelation: "sugerencias_precio"
            referencedColumns: ["id"]
          },
        ]
      }
      ingenieria_menu: {
        Row: {
          accion_sugerida: string | null
          clasificacion: string | null
          created_at: string | null
          familia: string | null
          food_cost_pct: number | null
          food_cost_unitario: number | null
          id: string
          ingresos: number | null
          margen_total: number | null
          margen_unitario: number | null
          periodo_fin: string
          periodo_inicio: string
          plato_id: string
          plato_nombre: string | null
          popularidad: string | null
          rentabilidad: string | null
          unidades_vendidas: number | null
        }
        Insert: {
          accion_sugerida?: string | null
          clasificacion?: string | null
          created_at?: string | null
          familia?: string | null
          food_cost_pct?: number | null
          food_cost_unitario?: number | null
          id?: string
          ingresos?: number | null
          margen_total?: number | null
          margen_unitario?: number | null
          periodo_fin: string
          periodo_inicio: string
          plato_id: string
          plato_nombre?: string | null
          popularidad?: string | null
          rentabilidad?: string | null
          unidades_vendidas?: number | null
        }
        Update: {
          accion_sugerida?: string | null
          clasificacion?: string | null
          created_at?: string | null
          familia?: string | null
          food_cost_pct?: number | null
          food_cost_unitario?: number | null
          id?: string
          ingresos?: number | null
          margen_total?: number | null
          margen_unitario?: number | null
          periodo_fin?: string
          periodo_inicio?: string
          plato_id?: string
          plato_nombre?: string | null
          popularidad?: string | null
          rentabilidad?: string | null
          unidades_vendidas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ingenieria_menu_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
        ]
      }
      lineas_albaran: {
        Row: {
          albaran_id: string
          cantidad: number | null
          codigo: string | null
          descripcion: string
          descuento_pct: number | null
          descuento_tipo: string | null
          id: string
          importe: number | null
          iva_pct: number | null
          precio_unitario: number | null
          subcategoria_id: string | null
        }
        Insert: {
          albaran_id: string
          cantidad?: number | null
          codigo?: string | null
          descripcion: string
          descuento_pct?: number | null
          descuento_tipo?: string | null
          id?: string
          importe?: number | null
          iva_pct?: number | null
          precio_unitario?: number | null
          subcategoria_id?: string | null
        }
        Update: {
          albaran_id?: string
          cantidad?: number | null
          codigo?: string | null
          descripcion?: string
          descuento_pct?: number | null
          descuento_tipo?: string | null
          id?: string
          importe?: number | null
          iva_pct?: number | null
          precio_unitario?: number | null
          subcategoria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lineas_albaran_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineas_albaran_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      mermas_registradas: {
        Row: {
          cantidad: number
          coste_estimado: number | null
          created_at: string | null
          fecha: string
          id: string
          motivo: string | null
          notas: string | null
          producto_id: string
          producto_nombre: string | null
          registrado_por: string | null
          unidad: string | null
        }
        Insert: {
          cantidad: number
          coste_estimado?: number | null
          created_at?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          notas?: string | null
          producto_id: string
          producto_nombre?: string | null
          registrado_por?: string | null
          unidad?: string | null
        }
        Update: {
          cantidad?: number
          coste_estimado?: number | null
          created_at?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          notas?: string | null
          producto_id?: string
          producto_nombre?: string | null
          registrado_por?: string | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mermas_registradas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_bancarios: {
        Row: {
          concepto: string | null
          confianza_match: number | null
          created_at: string | null
          cuenta_id: string
          entidad_id: string | null
          entidad_nombre: string | null
          estado: string | null
          factura_id: string | null
          fecha: string
          fecha_valor: string | null
          id: string
          importe: number
          notas: string | null
          referencia: string | null
          saldo: number | null
          tipo_detectado: string | null
        }
        Insert: {
          concepto?: string | null
          confianza_match?: number | null
          created_at?: string | null
          cuenta_id: string
          entidad_id?: string | null
          entidad_nombre?: string | null
          estado?: string | null
          factura_id?: string | null
          fecha: string
          fecha_valor?: string | null
          id?: string
          importe: number
          notas?: string | null
          referencia?: string | null
          saldo?: number | null
          tipo_detectado?: string | null
        }
        Update: {
          concepto?: string | null
          confianza_match?: number | null
          created_at?: string | null
          cuenta_id?: string
          entidad_id?: string | null
          entidad_nombre?: string | null
          estado?: string | null
          factura_id?: string | null
          fecha?: string
          fecha_valor?: string | null
          id?: string
          importe?: number
          notas?: string | null
          referencia?: string | null
          saldo?: number | null
          tipo_detectado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_bancarios_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_sugerido_lineas: {
        Row: {
          cantidad_ajustada: number | null
          cantidad_sugerida: number | null
          consumo_previsto: number | null
          created_at: string | null
          id: string
          motivo: string | null
          pedido_id: string
          precio_estimado: number | null
          producto_id: string | null
          producto_nombre: string | null
          stock_actual: number | null
          unidad: string | null
        }
        Insert: {
          cantidad_ajustada?: number | null
          cantidad_sugerida?: number | null
          consumo_previsto?: number | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          pedido_id: string
          precio_estimado?: number | null
          producto_id?: string | null
          producto_nombre?: string | null
          stock_actual?: number | null
          unidad?: string | null
        }
        Update: {
          cantidad_ajustada?: number | null
          cantidad_sugerida?: number | null
          consumo_previsto?: number | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          pedido_id?: string
          precio_estimado?: number | null
          producto_id?: string | null
          producto_nombre?: string | null
          stock_actual?: number | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_sugerido_lineas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_sugeridos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_sugerido_lineas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_sugeridos: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha_entrega: string
          fecha_generado: string
          id: string
          notas: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          total_estimado: number | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha_entrega: string
          fecha_generado?: string
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          total_estimado?: number | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha_entrega?: string
          fecha_generado?: string
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          total_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_sugeridos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          activo: boolean | null
          apellidos: string | null
          coste_empresa_mensual: number | null
          coste_hora: number | null
          coste_mensual: number | null
          created_at: string
          dni: string | null
          email: string | null
          fecha_alta: string | null
          fecha_baja: string | null
          foto_url: string | null
          horas_contrato: number | null
          id: string
          nombre: string
          notas: string | null
          puesto: string | null
          salario_bruto_mensual: number | null
          telefono: string | null
          tipo_contrato: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          apellidos?: string | null
          coste_empresa_mensual?: number | null
          coste_hora?: number | null
          coste_mensual?: number | null
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          foto_url?: string | null
          horas_contrato?: number | null
          id?: string
          nombre: string
          notas?: string | null
          puesto?: string | null
          salario_bruto_mensual?: number | null
          telefono?: string | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          apellidos?: string | null
          coste_empresa_mensual?: number | null
          coste_hora?: number | null
          coste_mensual?: number | null
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          foto_url?: string | null
          horas_contrato?: number | null
          id?: string
          nombre?: string
          notas?: string | null
          puesto?: string | null
          salario_bruto_mensual?: number | null
          telefono?: string | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plantillas_turno: {
        Row: {
          color: string | null
          created_at: string | null
          hora_fin: string
          hora_inicio: string
          id: string
          nombre: string
          pausa_minutos: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          hora_fin: string
          hora_inicio: string
          id?: string
          nombre: string
          pausa_minutos?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          nombre?: string
          pausa_minutos?: number | null
        }
        Relationships: []
      }
      plato_ingredientes: {
        Row: {
          cantidad: number | null
          coste: number | null
          id: string
          merma_porcentaje: number | null
          notas: string | null
          plato_id: string
          producto_id: string | null
          producto_nombre: string
          unidad: string | null
        }
        Insert: {
          cantidad?: number | null
          coste?: number | null
          id?: string
          merma_porcentaje?: number | null
          notas?: string | null
          plato_id: string
          producto_id?: string | null
          producto_nombre: string
          unidad?: string | null
        }
        Update: {
          cantidad?: number | null
          coste?: number | null
          id?: string
          merma_porcentaje?: number | null
          notas?: string | null
          plato_id?: string
          producto_id?: string | null
          producto_nombre?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plato_ingredientes_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plato_ingredientes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      platos: {
        Row: {
          coste: number | null
          created_at: string
          descripcion: string | null
          familia_id: string | null
          foto_url: string | null
          id: string
          iva_porcentaje: number | null
          margen_pct: number | null
          nombre: string
          pvp: number | null
          updated_at: string
        }
        Insert: {
          coste?: number | null
          created_at?: string
          descripcion?: string | null
          familia_id?: string | null
          foto_url?: string | null
          id?: string
          iva_porcentaje?: number | null
          margen_pct?: number | null
          nombre: string
          pvp?: number | null
          updated_at?: string
        }
        Update: {
          coste?: number | null
          created_at?: string
          descripcion?: string | null
          familia_id?: string | null
          foto_url?: string | null
          id?: string
          iva_porcentaje?: number | null
          margen_pct?: number | null
          nombre?: string
          pvp?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      precios_historico: {
        Row: {
          albaran_id: string | null
          cantidad: number | null
          created_at: string
          fecha: string
          id: string
          precio: number
          producto_id: string
          proveedor_id: string | null
          proveedor_nombre: string | null
        }
        Insert: {
          albaran_id?: string | null
          cantidad?: number | null
          created_at?: string
          fecha: string
          id?: string
          precio: number
          producto_id: string
          proveedor_id?: string | null
          proveedor_nombre?: string | null
        }
        Update: {
          albaran_id?: string | null
          cantidad?: number | null
          created_at?: string
          fecha?: string
          id?: string
          precio?: number
          producto_id?: string
          proveedor_id?: string | null
          proveedor_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precios_historico_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_historico_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_historico_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      predicciones_demanda: {
        Row: {
          basado_en_semanas: number | null
          confianza: number | null
          created_at: string | null
          factores: Json | null
          familia: string
          fecha_prediccion: string
          id: string
          unidades_predichas: number | null
        }
        Insert: {
          basado_en_semanas?: number | null
          confianza?: number | null
          created_at?: string | null
          factores?: Json | null
          familia: string
          fecha_prediccion: string
          id?: string
          unidades_predichas?: number | null
        }
        Update: {
          basado_en_semanas?: number | null
          confianza?: number | null
          created_at?: string | null
          factores?: Json | null
          familia?: string
          fecha_prediccion?: string
          id?: string
          unidades_predichas?: number | null
        }
        Relationships: []
      }
      productos: {
        Row: {
          categoria_id: string | null
          contenido_neto: number | null
          contenido_unidad: string | null
          created_at: string
          id: string
          nombre: string
          nombre_normalizado: string
          num_compras: number | null
          precio_actual: number | null
          precio_anterior: number | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          referencia: string | null
          subcategoria_id: string | null
          ultima_compra: string | null
          unidad: string | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          contenido_neto?: number | null
          contenido_unidad?: string | null
          created_at?: string
          id?: string
          nombre: string
          nombre_normalizado: string
          num_compras?: number | null
          precio_actual?: number | null
          precio_anterior?: number | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          referencia?: string | null
          subcategoria_id?: string | null
          ultima_compra?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          contenido_neto?: number | null
          contenido_unidad?: string | null
          created_at?: string
          id?: string
          nombre?: string
          nombre_normalizado?: string
          num_compras?: number | null
          precio_actual?: number | null
          precio_anterior?: number | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          referencia?: string | null
          subcategoria_id?: string | null
          ultima_compra?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          cif: string | null
          contacto: string | null
          created_at: string
          email: string | null
          id: string
          nombre: string
          telefono: string | null
          tipos: string[] | null
          updated_at: string
        }
        Insert: {
          cif?: string | null
          contacto?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          tipos?: string[] | null
          updated_at?: string
        }
        Update: {
          cif?: string | null
          contacto?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          tipos?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      reglas_conciliacion: {
        Row: {
          categoria: string | null
          created_at: string | null
          entidad_id: string | null
          entidad_nombre: string | null
          id: string
          patron_concepto: string
          tipo: string
          veces_usado: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          entidad_id?: string | null
          entidad_nombre?: string | null
          id?: string
          patron_concepto: string
          tipo: string
          veces_usado?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          entidad_id?: string | null
          entidad_nombre?: string | null
          id?: string
          patron_concepto?: string
          tipo?: string
          veces_usado?: number | null
        }
        Relationships: []
      }
      stock_conteos: {
        Row: {
          anyo: number | null
          cantidad: number
          created_at: string
          fecha: string
          id: string
          producto_id: string
          semana: number | null
          tipo: string | null
          unidad: string | null
        }
        Insert: {
          anyo?: number | null
          cantidad?: number
          created_at?: string
          fecha?: string
          id?: string
          producto_id: string
          semana?: number | null
          tipo?: string | null
          unidad?: string | null
        }
        Update: {
          anyo?: number | null
          cantidad?: number
          created_at?: string
          fecha?: string
          id?: string
          producto_id?: string
          semana?: number | null
          tipo?: string | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_conteos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_desviaciones: {
        Row: {
          compras_periodo: number | null
          consumo_real: number | null
          consumo_teorico: number | null
          created_at: string
          desviacion: number | null
          desviacion_euros: number | null
          desviacion_porcentaje: number | null
          id: string
          periodo_fin: string
          periodo_inicio: string
          producto_id: string
          stock_final: number | null
          stock_inicial: number | null
        }
        Insert: {
          compras_periodo?: number | null
          consumo_real?: number | null
          consumo_teorico?: number | null
          created_at?: string
          desviacion?: number | null
          desviacion_euros?: number | null
          desviacion_porcentaje?: number | null
          id?: string
          periodo_fin: string
          periodo_inicio: string
          producto_id: string
          stock_final?: number | null
          stock_inicial?: number | null
        }
        Update: {
          compras_periodo?: number | null
          consumo_real?: number | null
          consumo_teorico?: number | null
          created_at?: string
          desviacion?: number | null
          desviacion_euros?: number | null
          desviacion_porcentaje?: number | null
          id?: string
          periodo_fin?: string
          periodo_inicio?: string
          producto_id?: string
          stock_final?: number | null
          stock_inicial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_desviaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_minimos: {
        Row: {
          cantidad_minima: number | null
          cantidad_reposicion: number | null
          dias_entrega: number | null
          id: string
          producto_id: string
        }
        Insert: {
          cantidad_minima?: number | null
          cantidad_reposicion?: number | null
          dias_entrega?: number | null
          id?: string
          producto_id: string
        }
        Update: {
          cantidad_minima?: number | null
          cantidad_reposicion?: number | null
          dias_entrega?: number | null
          id?: string
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_minimos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: true
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_solicitudes_semanales: {
        Row: {
          anyo: number
          completado: boolean | null
          created_at: string
          fecha_completado: string | null
          id: string
          producto_id: string
          semana: number
        }
        Insert: {
          anyo: number
          completado?: boolean | null
          created_at?: string
          fecha_completado?: string | null
          id?: string
          producto_id: string
          semana: number
        }
        Update: {
          anyo?: number
          completado?: boolean | null
          created_at?: string
          fecha_completado?: string | null
          id?: string
          producto_id?: string
          semana?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_solicitudes_semanales_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategorias: {
        Row: {
          categoria_id: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          categoria_id: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          categoria_id?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      sugerencias_precio: {
        Row: {
          coste_anterior: number | null
          coste_nuevo: number | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          familia: string | null
          fecha_aplicada: string | null
          food_cost_anterior_pct: number | null
          food_cost_nuevo_pct: number | null
          id: string
          margen_anterior: number | null
          margen_nuevo: number | null
          notas_usuario: string | null
          plato_id: string
          plato_nombre: string | null
          precio_producto_anterior: number | null
          precio_producto_nuevo: number | null
          producto_id: string | null
          producto_nombre: string | null
          pvp_actual: number | null
          pvp_sugerido: number | null
          pvp_sugerido_con_iva: number | null
          tipo_sugerencia: string | null
          variacion_producto_pct: number | null
        }
        Insert: {
          coste_anterior?: number | null
          coste_nuevo?: number | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          familia?: string | null
          fecha_aplicada?: string | null
          food_cost_anterior_pct?: number | null
          food_cost_nuevo_pct?: number | null
          id?: string
          margen_anterior?: number | null
          margen_nuevo?: number | null
          notas_usuario?: string | null
          plato_id: string
          plato_nombre?: string | null
          precio_producto_anterior?: number | null
          precio_producto_nuevo?: number | null
          producto_id?: string | null
          producto_nombre?: string | null
          pvp_actual?: number | null
          pvp_sugerido?: number | null
          pvp_sugerido_con_iva?: number | null
          tipo_sugerencia?: string | null
          variacion_producto_pct?: number | null
        }
        Update: {
          coste_anterior?: number | null
          coste_nuevo?: number | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          familia?: string | null
          fecha_aplicada?: string | null
          food_cost_anterior_pct?: number | null
          food_cost_nuevo_pct?: number | null
          id?: string
          margen_anterior?: number | null
          margen_nuevo?: number | null
          notas_usuario?: string | null
          plato_id?: string
          plato_nombre?: string | null
          precio_producto_anterior?: number | null
          precio_producto_nuevo?: number | null
          producto_id?: string | null
          producto_nombre?: string | null
          pvp_actual?: number | null
          pvp_sugerido?: number | null
          pvp_sugerido_con_iva?: number | null
          tipo_sugerencia?: string | null
          variacion_producto_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sugerencias_precio_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugerencias_precio_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      suministros: {
        Row: {
          concepto: string
          created_at: string
          id: string
          importe: number | null
          mes: string
          tipo: string | null
        }
        Insert: {
          concepto: string
          created_at?: string
          id?: string
          importe?: number | null
          mes: string
          tipo?: string | null
        }
        Update: {
          concepto?: string
          created_at?: string
          id?: string
          importe?: number | null
          mes?: string
          tipo?: string | null
        }
        Relationships: []
      }
      turnos_planificados: {
        Row: {
          color: string | null
          created_at: string | null
          empleado_id: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          notas: string | null
          pausa_minutos: number | null
          puesto: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          empleado_id: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          notas?: string | null
          pausa_minutos?: number | null
          puesto?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          empleado_id?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          notas?: string | null
          pausa_minutos?: number | null
          puesto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_planificados_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
