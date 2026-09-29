import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { envPublico } from "@/lib/env";
import { descripcionSitio } from "@/lib/seo";
import { obtenerContenidoSitio } from "@/server/services/contenido";

/**
 * Imagen de vista previa al compartir el sitio (WhatsApp, Facebook, etc.): nombre,
 * descripción y ubicación del hogar sobre los colores del sitio. Es PNG porque no
 * todas las apps muestran WebP (el formato de las fotos subidas en el panel).
 *
 * Como las páginas públicas, se regenera al guardar cambios en el panel y cada hora.
 */
export const alt = "Presentación del hogar de reposo: nombre, descripción y ubicación";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

// Lora (la tipografía de títulos del sitio). Licencia SIL OFL: src/assets/fuentes/OFL.txt.
const fuenteTitulos = readFile(join(process.cwd(), "src/assets/fuentes/Lora-SemiBold.ttf"));

const COLORES = {
  crema: "#fbf7f0",
  salvia: "#2f5d4a",
  salviaOscuro: "#244a3b",
  salviaClaro: "#cfe0d5",
  tintaSuave: "#4a5750",
};

/** Corta un texto largo en la última palabra completa. */
function recortar(texto: string, maximo: number) {
  if (texto.length <= maximo) return texto;
  return `${texto.slice(0, maximo).replace(/\s+\S*$/, "")}…`;
}

export default async function OpengraphImage() {
  const { config } = await obtenerContenidoSitio();
  const lugar = [config.ciudad, config.region].filter(Boolean).join(", ");
  const dominio = new URL(envPublico.NEXT_PUBLIC_SITE_URL).host;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: COLORES.crema,
        fontFamily: "Lora",
      }}
    >
      <div style={{ width: 28, height: "100%", background: COLORES.salvia }} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: COLORES.salvia,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORES.crema}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div style={{ fontSize: 32, color: COLORES.salvia }}>
            Hogar de reposo para adultos mayores
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: config.nombre.length > 32 ? 64 : 84,
              lineHeight: 1.1,
              color: COLORES.salviaOscuro,
            }}
          >
            {recortar(config.nombre, 70)}
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.4, color: COLORES.tintaSuave }}>
            {recortar(descripcionSitio(config), 130)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: `3px solid ${COLORES.salviaClaro}`,
            fontSize: 28,
            color: COLORES.tintaSuave,
          }}
        >
          <div>{lugar}</div>
          <div>{dominio}</div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Lora", data: await fuenteTitulos, style: "normal", weight: 600 }],
    },
  );
}
