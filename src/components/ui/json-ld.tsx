/**
 * Datos estructurados (JSON-LD) para buscadores. Es un bloque de datos, no código: la
 * CSP no lo bloquea y no usa next/script.
 *
 * Se reemplaza "<" por su escape unicode para que ningún texto (editable desde el panel)
 * pueda cerrar la etiqueta <script> e inyectar HTML (XSS).
 */
export function JsonLd({ datos }: { datos: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}
