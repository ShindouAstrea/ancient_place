import { TriangleAlert } from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";

import { direccionCompleta } from "@/components/sections/ubicacion";
import { Contenedor } from "@/components/ui/seccion";
import { openGraphBase } from "@/lib/seo";
import { obtenerContenidoSitio } from "@/server/services/contenido";

export async function generateMetadata(
  _props: unknown,
  padre: ResolvingMetadata,
): Promise<Metadata> {
  const { config } = await obtenerContenidoSitio();
  const titulo = "Política de privacidad";
  const descripcion = `Cómo ${config.nombre} trata los datos personales de quienes nos contactan.`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: "/privacidad" },
    // Open Graph reemplaza (no combina) el del layout: se repiten los datos comunes y la
    // imagen para compartir (opengraph-image.tsx).
    openGraph: {
      ...openGraphBase(config),
      title: `${titulo} | ${config.nombre}`,
      description: descripcion,
      url: "/privacidad",
      images: (await padre).openGraph?.images ?? [],
    },
  };
}

/** Dato legal editable desde el panel; si falta, queda marcado como pendiente. */
const dato = (valor: string) => valor || "[por completar en el panel]";

/*
 * ⚠️ BORRADOR BASE. Este texto NO constituye asesoría legal y DEBE ser revisado y
 * adaptado por un abogado antes de publicar el sitio, considerando la Ley N° 19.628
 * y la Ley N° 21.719 (nueva ley de protección de datos personales).
 */

function Apartado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function PrivacidadPage() {
  const { config } = await obtenerContenidoSitio();

  return (
    <Contenedor className="py-12 sm:py-16">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <h1 className="text-4xl font-semibold">Política de privacidad</h1>
          <p className="text-tinta-suave">Última actualización: {dato(config.fecha_privacidad)}</p>
          <div
            role="note"
            className="flex gap-3 rounded-2xl border-2 border-terracota bg-white p-5 text-base"
          >
            <TriangleAlert className="mt-0.5 size-6 shrink-0 text-terracota" aria-hidden="true" />
            <p>
              <strong>Borrador pendiente de revisión legal.</strong> Este texto es una base y debe
              ser revisado por un abogado antes de publicar el sitio.
            </p>
          </div>
        </header>

        <Apartado titulo="1. Responsable del tratamiento">
          <p>
            {dato(config.razon_social)}, RUT {dato(config.rut)}, con domicilio en{" "}
            {dato(direccionCompleta(config))}, Chile (en adelante, &quot;{config.nombre}
            &quot;), es responsable del tratamiento de los datos personales recopilados a través de
            este sitio web.
          </p>
          <p>
            Para cualquier consulta sobre esta política o sobre tus datos, escríbenos a{" "}
            <a href={`mailto:${config.email_privacidad}`} className="font-semibold underline">
              {dato(config.email_privacidad)}
            </a>
            .
          </p>
        </Apartado>

        <Apartado titulo="2. Qué datos recopilamos">
          <p>Cuando completas el formulario de contacto, recopilamos:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Nombre completo.</li>
            <li>Número de teléfono.</li>
            <li>Correo electrónico.</li>
            <li>Parentesco con el adulto mayor (opcional).</li>
            <li>El mensaje que nos envías.</li>
            <li>La fecha y hora en que otorgaste tu consentimiento.</li>
          </ul>
          <p>
            Para prevenir el envío automatizado de mensajes (spam), procesamos un identificador
            cifrado e irreversible (hash) derivado de tu dirección IP. No almacenamos tu dirección
            IP en texto legible.
          </p>
          <p>
            <strong>Te pedimos no incluir información médica ni de salud</strong> en el mensaje del
            formulario. Esa información la conversaremos por un canal adecuado si decides avanzar
            con nosotros.
          </p>
        </Apartado>

        <Apartado titulo="3. Para qué usamos tus datos">
          <p>
            Usamos tus datos exclusivamente para responder tu solicitud de información y contactarte
            por teléfono, WhatsApp o correo electrónico en relación con ella. No vendemos ni cedemos
            tus datos a terceros, ni los usamos para publicidad sin tu consentimiento expreso y
            separado.
          </p>
        </Apartado>

        <Apartado titulo="4. Base legal">
          <p>
            Tratamos tus datos sobre la base de tu consentimiento, que otorgas al marcar la casilla
            correspondiente del formulario. Puedes retirarlo en cualquier momento escribiéndonos,
            sin que ello afecte la licitud del tratamiento realizado antes de su retiro.
          </p>
        </Apartado>

        <Apartado titulo="5. Proveedores que nos ayudan a operar el sitio">
          <p>
            Para funcionar, este sitio utiliza proveedores tecnológicos que procesan datos por
            cuenta nuestra. Algunos de ellos almacenan o procesan información fuera de Chile:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Supabase</strong>: base de datos donde se guardan las solicitudes (servidores
              en São Paulo, Brasil).
            </li>
            <li>
              <strong>Resend</strong>: envío de correos de notificación (Estados Unidos).
            </li>
            <li>
              <strong>Vercel</strong>: alojamiento del sitio web (Estados Unidos y red global).
            </li>
            <li>
              <strong>Cloudflare Turnstile</strong>: verificación antispam del formulario.
            </li>
            <li>
              <strong>Google Maps</strong>: mapa de ubicación insertado en el sitio. Google puede
              recopilar datos de navegación según su propia política de privacidad.
            </li>
          </ul>
        </Apartado>

        <Apartado titulo="6. Cuánto tiempo conservamos tus datos">
          <p>
            Conservamos los datos de las solicitudes de contacto durante{" "}
            {dato(config.plazo_conservacion)}. Luego los eliminamos o anonimizamos, salvo que exista
            una obligación legal de conservarlos.
          </p>
        </Apartado>

        <Apartado titulo="7. Tus derechos">
          <p>
            Puedes solicitar en cualquier momento el acceso, la rectificación, la supresión o la
            portabilidad de tus datos, oponerte a su tratamiento o pedir su bloqueo. Para ello,
            escríbenos a{" "}
            <a href={`mailto:${config.email_privacidad}`} className="font-semibold underline">
              {dato(config.email_privacidad)}
            </a>{" "}
            indicando tu nombre y la solicitud. Responderemos dentro de{" "}
            {dato(config.plazo_respuesta)}.
          </p>
          <p>
            Si consideras que no hemos atendido adecuadamente tu solicitud, puedes recurrir a la
            autoridad de protección de datos personales competente.
          </p>
        </Apartado>

        <Apartado titulo="8. Seguridad">
          <p>
            Aplicamos medidas técnicas y organizativas para proteger tus datos: conexión cifrada
            (HTTPS), acceso restringido solo a personal autorizado mediante controles a nivel de
            base de datos y autenticación sin contraseñas, y verificación antispam.
          </p>
        </Apartado>

        <Apartado titulo="9. Cookies">
          <p>
            Este sitio no utiliza cookies de publicidad ni de seguimiento propias. Solo se usan
            cookies técnicas necesarias para el acceso del personal autorizado al panel de
            administración. El mapa de Google insertado puede establecer sus propias cookies.
          </p>
        </Apartado>

        <Apartado titulo="10. Cambios a esta política">
          <p>
            Podemos actualizar esta política. Publicaremos cualquier cambio en esta página,
            indicando la fecha de la última actualización.
          </p>
        </Apartado>

        <p className="border-t border-salvia-200 pt-6 text-base text-tinta-suave">
          Contacto general: {dato(config.email_contacto)}
        </p>
      </article>
    </Contenedor>
  );
}
