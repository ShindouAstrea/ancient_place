import type { Enums, Tables } from "./database";

/**
 * Tipos del módulo Pacientes (fichas de residentes; datos de salud, sensibles).
 * Las fechas sin hora son "AAAA-MM-DD"; las horas, "HH:MM".
 */

export type GradoDeterioro = Enums<"grado_deterioro">;
export type SexoPaciente = Enums<"sexo_paciente">;

export type Paciente = Omit<Tables<"pacientes">, "created_by" | "updated_by">;

export type Medicamento = Pick<
  Tables<"medicamentos">,
  "id" | "nombre" | "dosis" | "indicaciones" | "situacional" | "motivo_situacional" | "dias"
> & {
  /** Horas "HH:MM" ordenadas. */
  horarios: string[];
};

export type FichaPaciente = Paciente & { medicamentos: Medicamento[] };

/** Lo que muestra el listado de pacientes. */
export type ResumenPaciente = Pick<
  Paciente,
  | "id"
  | "nombres"
  | "apellidos"
  | "habitacion"
  | "fecha_nacimiento"
  | "deterioro_cognitivo"
  | "alergias"
  | "fecha_egreso"
> & { cantidadMedicamentos: number };

export type EventoAuditoria = Tables<"auditoria_fichas">;

export type ResultadoDosis = Enums<"resultado_dosis">;
export type MotivoOmision = Enums<"motivo_omision">;

/** Registro de una dosis dada o no dada (nunca se edita ni se borra: se anula). */
export type Administracion = Pick<
  Tables<"administraciones">,
  | "id"
  | "medicamento_id"
  | "medicamento_nombre"
  | "dosis"
  | "fecha"
  | "resultado"
  | "motivo_omision"
  | "observacion"
  | "registrado_en"
  | "registrado_por"
  | "registrado_email"
  | "anulada_en"
  | "anulada_email"
  | "anulacion_motivo"
> & {
  /** "HH:MM" (null en los situacionales). */
  hora_programada: string | null;
};
