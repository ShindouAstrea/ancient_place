export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_roles: {
        Row: {
          created_at: string;
          rol: Database["public"]["Enums"]["rol_admin"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          rol: Database["public"]["Enums"]["rol_admin"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          rol?: Database["public"]["Enums"]["rol_admin"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["user_id"];
          },
        ];
      };
      administraciones: {
        Row: {
          anulacion_motivo: string;
          anulada_email: string | null;
          anulada_en: string | null;
          anulada_por: string | null;
          dosis: string;
          fecha: string;
          hora_programada: string | null;
          id: string;
          medicamento_id: string | null;
          medicamento_nombre: string;
          motivo_omision: Database["public"]["Enums"]["motivo_omision"] | null;
          observacion: string;
          paciente_id: string;
          registrado_email: string | null;
          registrado_en: string;
          registrado_por: string | null;
          resultado: Database["public"]["Enums"]["resultado_dosis"];
        };
        Insert: {
          anulacion_motivo?: string;
          anulada_email?: string | null;
          anulada_en?: string | null;
          anulada_por?: string | null;
          dosis: string;
          fecha: string;
          hora_programada?: string | null;
          id?: string;
          medicamento_id?: string | null;
          medicamento_nombre: string;
          motivo_omision?: Database["public"]["Enums"]["motivo_omision"] | null;
          observacion?: string;
          paciente_id: string;
          registrado_email?: string | null;
          registrado_en?: string;
          registrado_por?: string | null;
          resultado: Database["public"]["Enums"]["resultado_dosis"];
        };
        Update: {
          anulacion_motivo?: string;
          anulada_email?: string | null;
          anulada_en?: string | null;
          anulada_por?: string | null;
          dosis?: string;
          fecha?: string;
          hora_programada?: string | null;
          id?: string;
          medicamento_id?: string | null;
          medicamento_nombre?: string;
          motivo_omision?: Database["public"]["Enums"]["motivo_omision"] | null;
          observacion?: string;
          paciente_id?: string;
          registrado_email?: string | null;
          registrado_en?: string;
          registrado_por?: string | null;
          resultado?: Database["public"]["Enums"]["resultado_dosis"];
        };
        Relationships: [
          {
            foreignKeyName: "administraciones_medicamento_id_fkey";
            columns: ["medicamento_id"];
            isOneToOne: false;
            referencedRelation: "medicamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "administraciones_paciente_id_fkey";
            columns: ["paciente_id"];
            isOneToOne: false;
            referencedRelation: "pacientes";
            referencedColumns: ["id"];
          },
        ];
      };
      admins: {
        Row: {
          created_at: string;
          email: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      auditoria_fichas: {
        Row: {
          accion: string;
          antes: Json | null;
          despues: Json | null;
          fecha: string;
          id: number;
          paciente_id: string;
          referencia: string | null;
          tabla: string | null;
          usuario_email: string | null;
          usuario_id: string | null;
        };
        Insert: {
          accion: string;
          antes?: Json | null;
          despues?: Json | null;
          fecha?: string;
          id?: never;
          paciente_id: string;
          referencia?: string | null;
          tabla?: string | null;
          usuario_email?: string | null;
          usuario_id?: string | null;
        };
        Update: {
          accion?: string;
          antes?: Json | null;
          despues?: Json | null;
          fecha?: string;
          id?: never;
          paciente_id?: string;
          referencia?: string | null;
          tabla?: string | null;
          usuario_email?: string | null;
          usuario_id?: string | null;
        };
        Relationships: [];
      };
      configuracion_sitio: {
        Row: {
          ciudad: string;
          descripcion_corta: string;
          destacados: NonNullable<Json>;
          direccion: string;
          email_contacto: string;
          email_notificaciones: string;
          email_privacidad: string;
          email_remitente: string;
          fecha_privacidad: string;
          hero_foto: string | null;
          hero_foto_alt: string;
          hero_foto_alto: number | null;
          hero_foto_ancho: number | null;
          hero_subtitulo: string;
          hero_titulo: string;
          horario_tramos: NonNullable<Json>;
          horario_visitas: string;
          id: boolean;
          instalaciones_intro: string;
          maps_embed_url: string;
          maps_url: string;
          mensaje_whatsapp: string;
          nombre: string;
          nosotros_texto: string;
          plazo_conservacion: string;
          plazo_respuesta: string;
          razon_social: string;
          region: string;
          rut: string;
          servicios_intro: string;
          telefono: string;
          updated_at: string;
          whatsapp: string;
        };
        Insert: {
          ciudad?: string;
          descripcion_corta?: string;
          destacados?: NonNullable<Json>;
          direccion?: string;
          email_contacto?: string;
          email_notificaciones?: string;
          email_privacidad?: string;
          email_remitente?: string;
          fecha_privacidad?: string;
          hero_foto?: string | null;
          hero_foto_alt?: string;
          hero_foto_alto?: number | null;
          hero_foto_ancho?: number | null;
          hero_subtitulo?: string;
          hero_titulo?: string;
          horario_tramos?: NonNullable<Json>;
          horario_visitas?: string;
          id?: boolean;
          instalaciones_intro?: string;
          maps_embed_url?: string;
          maps_url?: string;
          mensaje_whatsapp?: string;
          nombre?: string;
          nosotros_texto?: string;
          plazo_conservacion?: string;
          plazo_respuesta?: string;
          razon_social?: string;
          region?: string;
          rut?: string;
          servicios_intro?: string;
          telefono?: string;
          updated_at?: string;
          whatsapp?: string;
        };
        Update: {
          ciudad?: string;
          descripcion_corta?: string;
          destacados?: NonNullable<Json>;
          direccion?: string;
          email_contacto?: string;
          email_notificaciones?: string;
          email_privacidad?: string;
          email_remitente?: string;
          fecha_privacidad?: string;
          hero_foto?: string | null;
          hero_foto_alt?: string;
          hero_foto_alto?: number | null;
          hero_foto_ancho?: number | null;
          hero_subtitulo?: string;
          hero_titulo?: string;
          horario_tramos?: NonNullable<Json>;
          horario_visitas?: string;
          id?: boolean;
          instalaciones_intro?: string;
          maps_embed_url?: string;
          maps_url?: string;
          mensaje_whatsapp?: string;
          nombre?: string;
          nosotros_texto?: string;
          plazo_conservacion?: string;
          plazo_respuesta?: string;
          razon_social?: string;
          region?: string;
          rut?: string;
          servicios_intro?: string;
          telefono?: string;
          updated_at?: string;
          whatsapp?: string;
        };
        Relationships: [];
      };
      fotos: {
        Row: {
          alt: string;
          alto: number;
          ancho: number;
          created_at: string;
          id: string;
          orden: number;
          ruta: string;
          updated_at: string;
        };
        Insert: {
          alt: string;
          alto: number;
          ancho: number;
          created_at?: string;
          id?: string;
          orden?: number;
          ruta: string;
          updated_at?: string;
        };
        Update: {
          alt?: string;
          alto?: number;
          ancho?: number;
          created_at?: string;
          id?: string;
          orden?: number;
          ruta?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          consentimiento: boolean;
          created_at: string;
          email: string;
          estado: Database["public"]["Enums"]["estado_lead"];
          fecha_consentimiento: string;
          id: string;
          mensaje: string;
          nombre: string;
          parentesco: string | null;
          telefono: string;
          updated_at: string;
        };
        Insert: {
          consentimiento: boolean;
          created_at?: string;
          email: string;
          estado?: Database["public"]["Enums"]["estado_lead"];
          fecha_consentimiento?: string;
          id?: string;
          mensaje: string;
          nombre: string;
          parentesco?: string | null;
          telefono: string;
          updated_at?: string;
        };
        Update: {
          consentimiento?: boolean;
          created_at?: string;
          email?: string;
          estado?: Database["public"]["Enums"]["estado_lead"];
          fecha_consentimiento?: string;
          id?: string;
          mensaje?: string;
          nombre?: string;
          parentesco?: string | null;
          telefono?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      medicamentos: {
        Row: {
          created_at: string;
          created_by: string | null;
          dias: number[];
          dosis: string;
          horarios: string[];
          id: string;
          indicaciones: string;
          motivo_situacional: string;
          nombre: string;
          paciente_id: string;
          situacional: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          dias?: number[];
          dosis: string;
          horarios?: string[];
          id?: string;
          indicaciones?: string;
          motivo_situacional?: string;
          nombre: string;
          paciente_id: string;
          situacional?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          dias?: number[];
          dosis?: string;
          horarios?: string[];
          id?: string;
          indicaciones?: string;
          motivo_situacional?: string;
          nombre?: string;
          paciente_id?: string;
          situacional?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medicamentos_paciente_id_fkey";
            columns: ["paciente_id"];
            isOneToOne: false;
            referencedRelation: "pacientes";
            referencedColumns: ["id"];
          },
        ];
      };
      pacientes: {
        Row: {
          alergias: string;
          apellidos: string;
          codigo_qr: string;
          contacto_nombre: string;
          contacto_parentesco: string;
          contacto_telefono: string;
          created_at: string;
          created_by: string | null;
          deterioro_cognitivo: Database["public"]["Enums"]["grado_deterioro"];
          deterioro_detalle: string;
          fecha_egreso: string | null;
          fecha_ingreso: string | null;
          fecha_nacimiento: string | null;
          habitacion: string;
          id: string;
          medico_tratante: string;
          nombres: string;
          observaciones: string;
          prevision: string;
          rut: string;
          sexo: Database["public"]["Enums"]["sexo_paciente"] | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          alergias?: string;
          apellidos: string;
          codigo_qr?: string;
          contacto_nombre?: string;
          contacto_parentesco?: string;
          contacto_telefono?: string;
          created_at?: string;
          created_by?: string | null;
          deterioro_cognitivo?: Database["public"]["Enums"]["grado_deterioro"];
          deterioro_detalle?: string;
          fecha_egreso?: string | null;
          fecha_ingreso?: string | null;
          fecha_nacimiento?: string | null;
          habitacion?: string;
          id?: string;
          medico_tratante?: string;
          nombres: string;
          observaciones?: string;
          prevision?: string;
          rut?: string;
          sexo?: Database["public"]["Enums"]["sexo_paciente"] | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          alergias?: string;
          apellidos?: string;
          codigo_qr?: string;
          contacto_nombre?: string;
          contacto_parentesco?: string;
          contacto_telefono?: string;
          created_at?: string;
          created_by?: string | null;
          deterioro_cognitivo?: Database["public"]["Enums"]["grado_deterioro"];
          deterioro_detalle?: string;
          fecha_egreso?: string | null;
          fecha_ingreso?: string | null;
          fecha_nacimiento?: string | null;
          habitacion?: string;
          id?: string;
          medico_tratante?: string;
          nombres?: string;
          observaciones?: string;
          prevision?: string;
          rut?: string;
          sexo?: Database["public"]["Enums"]["sexo_paciente"] | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      preguntas_frecuentes: {
        Row: {
          created_at: string;
          id: string;
          orden: number;
          pregunta: string;
          respuesta: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          orden?: number;
          pregunta: string;
          respuesta: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          orden?: number;
          pregunta?: string;
          respuesta?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          accion: string;
          contador: number;
          ip_hash: string;
          ventana_inicio: string;
        };
        Insert: {
          accion: string;
          contador?: number;
          ip_hash: string;
          ventana_inicio?: string;
        };
        Update: {
          accion?: string;
          contador?: number;
          ip_hash?: string;
          ventana_inicio?: string;
        };
        Relationships: [];
      };
      razones: {
        Row: {
          created_at: string;
          descripcion: string;
          icono: string;
          id: string;
          orden: number;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descripcion?: string;
          icono?: string;
          id?: string;
          orden?: number;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descripcion?: string;
          icono?: string;
          id?: string;
          orden?: number;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      servicios: {
        Row: {
          created_at: string;
          descripcion: string;
          icono: string;
          id: string;
          orden: number;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descripcion?: string;
          icono?: string;
          id?: string;
          orden?: number;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descripcion?: string;
          icono?: string;
          id?: string;
          orden?: number;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      testimonios: {
        Row: {
          autor: string;
          created_at: string;
          id: string;
          orden: number;
          relacion: string;
          texto: string;
          updated_at: string;
        };
        Insert: {
          autor: string;
          created_at?: string;
          id?: string;
          orden?: number;
          relacion?: string;
          texto: string;
          updated_at?: string;
        };
        Update: {
          autor?: string;
          created_at?: string;
          id?: string;
          orden?: number;
          relacion?: string;
          texto?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      anular_administracion: { Args: { p_id: string; p_motivo: string }; Returns: undefined };
      crear_lead: {
        Args: {
          p_consentimiento: boolean;
          p_email: string;
          p_mensaje: string;
          p_nombre: string;
          p_parentesco: string;
          p_secreto: string;
          p_telefono: string;
        };
        Returns: string;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      puede_editar_fichas: { Args: Record<PropertyKey, never>; Returns: boolean };
      puede_ver_fichas: { Args: Record<PropertyKey, never>; Returns: boolean };
      registrar_consulta_ficha: { Args: { p_paciente_id: string }; Returns: undefined };
      tiene_rol: { Args: { p_rol: Database["public"]["Enums"]["rol_admin"] }; Returns: boolean };
      verificar_rate_limit: {
        Args: { p_accion: string; p_ip_hash: string; p_secreto: string };
        Returns: boolean;
      };
    };
    Enums: {
      estado_lead: "nuevo" | "contactado" | "descartado";
      grado_deterioro: "no_evaluado" | "sin_deterioro" | "leve" | "moderado" | "severo";
      motivo_omision:
        "rechazo" | "dormido" | "ausente" | "sin_stock" | "indicacion_medica" | "otro";
      resultado_dosis: "administrada" | "omitida";
      rol_admin: "sitio" | "pacientes" | "pacientes_lectura";
      sexo_paciente: "femenino" | "masculino" | "otro";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      estado_lead: ["nuevo", "contactado", "descartado"],
      grado_deterioro: ["no_evaluado", "sin_deterioro", "leve", "moderado", "severo"],
      motivo_omision: ["rechazo", "dormido", "ausente", "sin_stock", "indicacion_medica", "otro"],
      resultado_dosis: ["administrada", "omitida"],
      rol_admin: ["sitio", "pacientes", "pacientes_lectura"],
      sexo_paciente: ["femenino", "masculino", "otro"],
    },
  },
} as const;
