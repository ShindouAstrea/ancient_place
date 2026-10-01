import { hoyEnChile } from "@/lib/utils/fechas";
import { DIAS_SEMANA, PATRON_HORA } from "@/lib/utils/horario";
import { z } from "@/lib/zod";
import { Constants } from "@/types/database";
import type { GradoDeterioro, SexoPaciente } from "@/types/pacientes";

import { rutValido, telefonoOpcional } from "./contenido";

/**
 * Validación de las fichas de pacientes. Se usa en el navegador (respuesta inmediata)
 * y en el servidor (fuente de verdad); la base de datos repite los límites con CHECK.
 */

export const GRADOS_DETERIORO = Constants.public.Enums.grado_deterioro;
export const SEXOS = Constants.public.Enums.sexo_paciente;

export const ETIQUETAS_DETERIORO: Record<GradoDeterioro, string> = {
  no_evaluado: "No evaluado",
  sin_deterioro: "Sin deterioro",
  leve: "Leve",
  moderado: "Moderado",
  severo: "Severo",
};

export const ETIQUETAS_SEXO: Record<SexoPaciente, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
};

const texto = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, { error: `Puede tener hasta ${maximo} caracteres.` });

const textoObligatorio = (maximo: number, mensaje: string) =>
  texto(maximo).min(1, { error: mensaje });

/** RUT: se acepta con o sin puntos ni guion, y se guarda como 12345678-9. */
export function normalizarRut(rut: string): string {
  const limpio = rut.replace(/[.\s-]/g, "").toUpperCase();
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

const rutOpcional = z
  .string()
  .trim()
  .max(20)
  .transform((valor, ctx) => {
    if (!valor) return "";
    if (!rutValido(valor)) {
      ctx.addIssue({
        code: "custom",
        message: "El RUT no es válido. Revisa el dígito verificador.",
      });
      return z.NEVER;
    }
    return normalizarRut(valor);
  });

/** Fecha opcional de un <input type="date"> ("AAAA-MM-DD"); vacía → null. */
const fechaOpcional = ({ desde, futura }: { desde: string; futura: boolean }) =>
  z
    .string()
    .trim()
    .transform((valor, ctx) => {
      if (!valor) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
        ctx.addIssue({ code: "custom", message: "Ingresa una fecha válida." });
        return z.NEVER;
      }
      if (valor < desde) {
        ctx.addIssue({ code: "custom", message: "Revisa el año de la fecha." });
        return z.NEVER;
      }
      if (!futura && valor > hoyEnChile()) {
        ctx.addIssue({ code: "custom", message: "La fecha no puede ser posterior a hoy." });
        return z.NEVER;
      }
      return valor;
    });

/** Datos de la ficha (crear o editar). */
export const esquemaPaciente = z
  .object({
    nombres: textoObligatorio(100, "Ingresa los nombres."),
    apellidos: textoObligatorio(100, "Ingresa los apellidos."),
    rut: rutOpcional,
    fecha_nacimiento: fechaOpcional({ desde: "1900-01-01", futura: false }),
    sexo: z
      .union([z.enum(SEXOS), z.literal("")], { error: "Elige una opción de la lista." })
      .transform((valor) => valor || null),
    fecha_ingreso: fechaOpcional({ desde: "1950-01-01", futura: true }),
    habitacion: texto(50),
    alergias: texto(1000),
    prevision: texto(100),
    medico_tratante: texto(150),
    deterioro_cognitivo: z.enum(GRADOS_DETERIORO, { error: "Elige una opción de la lista." }),
    deterioro_detalle: texto(1000),
    observaciones: texto(5000),
    contacto_nombre: texto(100),
    contacto_parentesco: texto(50),
    contacto_telefono: telefonoOpcional,
  })
  .superRefine((datos, ctx) => {
    if (
      datos.fecha_ingreso &&
      datos.fecha_nacimiento &&
      datos.fecha_ingreso < datos.fecha_nacimiento
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fecha_ingreso"],
        message: "La fecha de ingreso no puede ser anterior al nacimiento.",
      });
    }
  });

export type CampoPaciente = keyof z.input<typeof esquemaPaciente>;
export type DatosPaciente = z.output<typeof esquemaPaciente>;

/** Máximo de horas por medicamento (la base de datos permite hasta 12). */
export const MAXIMO_HORARIOS = 8;

/** Un medicamento: programado (con horas y días) o situacional (con su motivo). */
export const esquemaMedicamento = z
  .object({
    nombre: textoObligatorio(150, "Ingresa el nombre del medicamento."),
    dosis: textoObligatorio(100, "Indica la dosis o medida (ej: 50 mg, 1 comprimido, 10 gotas)."),
    indicaciones: texto(500),
    situacional: z.boolean(),
    motivo_situacional: texto(500),
    horarios: z.array(z.string()),
    dias: z.array(z.number()),
  })
  .superRefine((m, ctx) => {
    if (m.situacional) {
      if (!m.motivo_situacional) {
        ctx.addIssue({
          code: "custom",
          path: ["motivo_situacional"],
          message: "Indica en qué situación se administra (ej: dolor o fiebre sobre 38 °C).",
        });
      }
      return;
    }
    if (m.horarios.length === 0) {
      ctx.addIssue({ code: "custom", path: ["horarios"], message: "Agrega al menos una hora." });
    } else if (m.horarios.some((h) => !PATRON_HORA.test(h))) {
      ctx.addIssue({ code: "custom", path: ["horarios"], message: "Revisa las horas ingresadas." });
    } else if (m.horarios.length > MAXIMO_HORARIOS) {
      ctx.addIssue({
        code: "custom",
        path: ["horarios"],
        message: `Puedes indicar hasta ${MAXIMO_HORARIOS} horas.`,
      });
    }
    if (m.dias.length === 0) {
      ctx.addIssue({ code: "custom", path: ["dias"], message: "Marca al menos un día." });
    }
  })
  // Horas y días ordenados y sin repetir. Un situacional no tiene horario fijo.
  .transform((m) => ({
    ...m,
    motivo_situacional: m.situacional ? m.motivo_situacional : "",
    horarios: m.situacional ? [] : [...new Set(m.horarios)].sort(),
    dias: m.situacional
      ? [...DIAS_SEMANA]
      : [...new Set(m.dias)]
          .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
          .sort((a, b) => a - b),
  }));

export type CampoMedicamento = keyof z.input<typeof esquemaMedicamento>;
export type DatosMedicamento = z.output<typeof esquemaMedicamento>;

/** Lee un medicamento desde el FormData del formulario (horas repetidas, casillas por día). */
export function medicamentoDesdeFormulario(formData: FormData) {
  const texto = (campo: string) => {
    const valor = formData.get(campo);
    return typeof valor === "string" ? valor : "";
  };
  return {
    nombre: texto("nombre"),
    dosis: texto("dosis"),
    indicaciones: texto("indicaciones"),
    situacional: formData.get("situacional") !== null,
    motivo_situacional: texto("motivo_situacional"),
    horarios: formData
      .getAll("horario")
      .filter((h): h is string => typeof h === "string" && h.trim() !== "")
      // Algunos navegadores envían segundos ("08:00:00"): se guardan horas y minutos.
      .map((h) => h.trim().slice(0, 5)),
    dias: DIAS_SEMANA.filter((d) => formData.get(`dia_${d}`) !== null),
  };
}

/** Código del QR: 32 caracteres hexadecimales (ver migración de fichas). */
export const esquemaCodigoQr = z.string().regex(/^[0-9a-f]{32}$/);
