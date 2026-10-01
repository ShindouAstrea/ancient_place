import { encode } from "uqr";

/**
 * Código QR como SVG, generado en el servidor (sin imágenes externas ni JavaScript en
 * el navegador). Corrección de errores "M" (15 %): sigue leyéndose con la etiqueta algo
 * gastada; margen de 4 módulos, el recomendado para que los celulares lo detecten.
 */
export function CodigoQr({
  texto,
  tamano,
  etiqueta,
}: {
  texto: string;
  tamano: number;
  etiqueta: string;
}) {
  const { data } = encode(texto, { ecc: "M", border: 4 });
  const lado = data.length;
  // Un solo <path> con un cuadrado por módulo negro.
  let trazo = "";
  data.forEach((fila, y) =>
    fila.forEach((negro, x) => {
      if (negro) trazo += `M${x} ${y}h1v1h-1z`;
    }),
  );

  return (
    <svg
      viewBox={`0 0 ${lado} ${lado}`}
      width={tamano}
      height={tamano}
      shapeRendering="crispEdges"
      role="img"
      aria-label={etiqueta}
    >
      <rect width={lado} height={lado} fill="#ffffff" />
      <path d={trazo} fill="#000000" />
    </svg>
  );
}
