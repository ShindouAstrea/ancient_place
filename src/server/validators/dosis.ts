import { PATRON_HORA } from "@/lib/utils/horario";
import { z } from "@/lib/zod";
import { Constants } from "@/types/database";
import type { MotivoOmision } from "@/types/pacientes";

/** Registro de dosis. Se usa en el navegador y en el servidor; la base repite las reglas. */

export const MOTIVOS_OMISION = Constants.public.Enums.motivo_omision;

export const ETIQUETAS_MOTIVO_OMISION: Record<MotivoOmision, string> = {
  rechazo: "Rechazó el medicamento",
  dormido: "Estaba dormido",
  ausente: "Ausente (hospital, salida)",
  sin_stock: "No había medicamento",
  indicacion_medica: "Indicación médica",
  otro: "Otro motivo",
};

const observacion = z.string().trim().max(500, { error: "Puede tener hasta 500 caracteres." });

/** Dosis programada: dada, o no dada con su motivo. */
export const esquemaDosisProgramada = z
  .object({
    medicamentoId: z.uuid(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hora: z.string().regex(PATRON_HORA),
    resultado: z.enum(["administrada", "omitida"]),
    motivo: z.enum(MOTIVOS_OMISION).nullable(),
    observacion,
  })
  .superRefine((d, ctx) => {
    if (d.resultado === "omitida" && !d.motivo) {
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "Elige por qué no se dio." });
    }
    if (d.motivo === "otro" && !d.observacion) {
      ctx.addIssue({
        code: "custom",
        path: ["observacion"],
        message: "Cuenta brevemente qué pasó.",
      });
    }
  })
  .transform((d) => ({ ...d, motivo: d.resultado === "omitida" ? d.motivo : null }));

export type DatosDosisProgramada = z.output<typeof esquemaDosisProgramada>;

/** Dosis de un medicamento situacional: siempre dada, con la situación que la motivó. */
export const esquemaDosisSituacional = z.object({
  medicamentoId: z.uuid(),
  observacion: observacion.min(1, {
    error: "Indica la situación (ej: dolor 6/10, fiebre 38,5 °C).",
  }),
});

export const esquemaAnulacion = z.object({
  id: z.uuid(),
  motivo: z
    .string()
    .trim()
    .min(3, { error: "Explica brevemente por qué se anula." })
    .max(300, { error: "Puede tener hasta 300 caracteres." }),
});

/** Mensajes para las reglas que valida la base de datos (códigos de privado.preparar_administracion). */
export const MENSAJES_REGLA_DOSIS: Record<string, string> = {
  medicamento_inexistente: "Este medicamento ya no está en la ficha. Recarga la página.",
  paciente_egresado: "El residente está egresado: no se registran dosis.",
  hora_no_corresponde: "Esa hora ya no corresponde a este medicamento. Recarga la página.",
  dia_no_corresponde: "Este medicamento no se da este día. Recarga la página.",
  fecha_fuera_de_plazo: "Solo se registran dosis de hoy o de anoche.",
  dosis_futura: "Todavía es muy temprano para esta dosis (se puede registrar hasta 2 horas antes).",
  situacional_sin_horario: "No se pudo registrar. Recarga la página e inténtalo de nuevo.",
  situacional_sin_observacion: "Indica la situación que motivó la dosis.",
};
