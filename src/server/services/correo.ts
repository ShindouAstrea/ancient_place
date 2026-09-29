import "server-only";

import { envPublico, envServidor } from "@/lib/env";
import {
  enlaceTelefono,
  enlaceWhatsapp,
  esCelularChileno,
  formatearTelefono,
  mensajeRespuestaWhatsapp,
} from "@/lib/utils/contacto";
import { escaparHtml } from "@/lib/utils/html";
import { leerConfiguracion } from "@/server/repositories/contenido";
import type { DatosContacto } from "@/server/validators/contacto";

const URL_RESEND = "https://api.resend.com/emails";

type CorreoNotificacion = { asunto: string; html: string; texto: string };

function fechaChile(fecha: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(fecha);
}

/** Plantilla simple con estilos en línea (los clientes de correo ignoran CSS externo). */
export function plantillaNuevoLead(
  datos: DatosContacto,
  nombreHogar: string,
  fecha = new Date(),
): CorreoNotificacion {
  const whatsapp = enlaceWhatsapp(
    datos.telefono,
    mensajeRespuestaWhatsapp(datos.nombre, nombreHogar),
  );
  const panel = `${envPublico.NEXT_PUBLIC_SITE_URL}/admin/leads`;
  const e = escaparHtml;

  const filas: [string, string][] = [
    ["Nombre", e(datos.nombre)],
    [
      "Teléfono",
      `<a href="${e(enlaceTelefono(datos.telefono))}">${e(formatearTelefono(datos.telefono))}</a>`,
    ],
    ["Correo", `<a href="mailto:${e(datos.email)}">${e(datos.email)}</a>`],
    ["Parentesco", e(datos.parentesco ?? "No indicado")],
    ["Recibido", e(fechaChile(fecha))],
  ];

  const boton = (href: string, texto: string, color: string) =>
    `<a href="${e(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:12px 20px;border-radius:999px;background:${color};color:#ffffff;font-weight:bold;text-decoration:none">${texto}</a>`;

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#fbf7f0;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #cfe0d5">
    <h1 style="margin:0 0 16px;font-size:22px;color:#244a3b">Nueva solicitud de información</h1>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:16px">
      ${filas
        .map(
          ([etiqueta, valor]) =>
            `<tr><td style="padding:6px 12px 6px 0;color:#4a5750;vertical-align:top;white-space:nowrap">${etiqueta}</td><td style="padding:6px 0">${valor}</td></tr>`,
        )
        .join("\n      ")}
    </table>
    <h2 style="margin:20px 0 8px;font-size:17px">Mensaje</h2>
    <p style="margin:0;padding:12px;background:#f2f7f4;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font-size:16px;line-height:1.5">${e(datos.mensaje)}</p>
    <div style="margin-top:20px">
      ${esCelularChileno(datos.telefono) ? boton(whatsapp, "Responder por WhatsApp", "#1a7446") : ""}
      ${boton(enlaceTelefono(datos.telefono), "Llamar", "#2f5d4a")}
    </div>
    <p style="margin:20px 0 0;font-size:14px;color:#4a5750">
      Gestiona este contacto en el <a href="${e(panel)}" style="color:#244a3b">panel de administración</a>.
      Para responder por correo, usa "Responder": irá directo a la persona interesada.
    </p>
  </div>
</body>
</html>`;

  // Versión de texto plano: la leen clientes sin HTML y mejora la entregabilidad.
  const texto = [
    "Nueva solicitud de información",
    "",
    `Nombre: ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
    `Correo: ${datos.email}`,
    `Parentesco: ${datos.parentesco ?? "No indicado"}`,
    `Recibido: ${fechaChile(fecha)}`,
    "",
    "Mensaje:",
    datos.mensaje,
    "",
    ...(esCelularChileno(datos.telefono) ? [`Responder por WhatsApp: ${whatsapp}`] : []),
    `Panel: ${panel}`,
  ].join("\n");

  // Sin saltos de línea en el asunto (evita inyección de cabeceras).
  const asunto = `Nuevo contacto: ${datos.nombre}`.replace(/[\r\n]+/g, " ").slice(0, 150);

  return { asunto, html, texto };
}

export type ResultadoAviso = "enviado" | "sin-resend" | "sin-destinatario";

/**
 * Envía el aviso de un nuevo lead al correo de notificaciones (configurado en el panel).
 * Si falta la API key de Resend o el destinatario/remitente, el aviso se omite (el lead
 * ya está guardado). Lanza un error si Resend rechaza el envío.
 */
export async function enviarNotificacionNuevoLead(
  leadId: string,
  datos: DatosContacto,
): Promise<ResultadoAviso> {
  const claveApi = envServidor().RESEND_API_KEY;
  if (!claveApi) return "sin-resend";

  const config = await leerConfiguracion();
  if (!config.email_notificaciones || !config.email_remitente) return "sin-destinatario";

  const { asunto, html, texto } = plantillaNuevoLead(datos, config.nombre);

  const respuesta = await fetch(URL_RESEND, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${claveApi}`,
      "Content-Type": "application/json",
      // Si el envío se reintenta, Resend no duplica el correo.
      "Idempotency-Key": `lead-${leadId}`,
    },
    body: JSON.stringify({
      from: config.email_remitente,
      to: [config.email_notificaciones],
      reply_to: datos.email,
      subject: asunto,
      html,
      text: texto,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!respuesta.ok) {
    // Solo el código HTTP: el cuerpo podría repetir direcciones de correo.
    throw new Error(`Resend rechazó el envío (HTTP ${respuesta.status})`);
  }
  return "enviado";
}
