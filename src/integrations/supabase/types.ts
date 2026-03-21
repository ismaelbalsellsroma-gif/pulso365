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
      personal: {
        Row: {
          activo: boolean | null
          coste_mensual: number | null
          created_at: string
          dni: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          coste_mensual?: number | null
          created_at?: string
          dni?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          coste_mensual?: number | null
          created_at?: string
          dni?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      plato_ingredientes: {
        Row: {
          cantidad: number | null
          coste: number | null
          id: string
          plato_id: string
          producto_id: string | null
          producto_nombre: string
          unidad: string | null
        }
        Insert: {
          cantidad?: number | null
          coste?: number | null
          id?: string
          plato_id: string
          producto_id?: string | null
          producto_nombre: string
          unidad?: string | null
        }
        Update: {
          cantidad?: number | null
          coste?: number | null
          id?: string
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
          familia_id: string | null
          id: string
          margen_pct: number | null
          nombre: string
          pvp: number | null
          updated_at: string
        }
        Insert: {
          coste?: number | null
          created_at?: string
          familia_id?: string | null
          id?: string
          margen_pct?: number | null
          nombre: string
          pvp?: number | null
          updated_at?: string
        }
        Update: {
          coste?: number | null
          created_at?: string
          familia_id?: string | null
          id?: string
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
      productos: {
        Row: {
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
