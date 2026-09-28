"use client";

import { useEffect, useRef } from "react";

type OpcionesTurnstile = {
  sitekey: string;
  action?: string;
  language?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
  "refresh-expired"?: "auto" | "manual" | "never";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (contenedor: HTMLElement, opciones: OpcionesTurnstile) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const URL_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let cargaScript: Promise<void> | null = null;

/** Carga el script de Turnstile una sola vez, aunque haya varios widgets. */
function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  cargaScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = URL_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      cargaScript = null;
      reject(new Error("No se pudo cargar Turnstile"));
    };
    document.head.appendChild(script);
  });
  return cargaScript;
}

type Props = {
  siteKey: string;
  accion: string;
  /** Cambiar este valor reinicia el widget (los tokens son de un solo uso). */
  reinicio: number;
  onEstado: (estado: "listo" | "pendiente" | "error") => void;
};

/**
 * Widget de Cloudflare Turnstile (antispam sin captchas molestos).
 * - Carga diferida: el script solo se descarga cuando el formulario está cerca de
 *   la pantalla, para no afectar la carga inicial de la landing.
 * - Turnstile agrega por sí mismo un campo oculto "cf-turnstile-response" al
 *   formulario que lo contiene; el servidor verifica ese token.
 */
export function Turnstile({ siteKey, accion, reinicio, onEstado }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onEstadoRef = useRef(onEstado);

  useEffect(() => {
    onEstadoRef.current = onEstado;
  }, [onEstado]);

  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    let cancelado = false;

    const renderizar = async () => {
      try {
        await cargarScript();
      } catch {
        onEstadoRef.current("error");
        return;
      }
      if (cancelado || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(elemento, {
        sitekey: siteKey,
        action: accion,
        language: "es",
        theme: "light",
        size: "flexible",
        "refresh-expired": "auto",
        callback: () => onEstadoRef.current("listo"),
        "expired-callback": () => onEstadoRef.current("pendiente"),
        "error-callback": () => onEstadoRef.current("error"),
      });
    };

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          observador.disconnect();
          void renderizar();
        }
      },
      { rootMargin: "600px" },
    );
    observador.observe(elemento);

    return () => {
      cancelado = true;
      observador.disconnect();
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, accion]);

  useEffect(() => {
    if (reinicio > 0 && widgetId.current && window.turnstile) {
      onEstadoRef.current("pendiente");
      window.turnstile.reset(widgetId.current);
    }
  }, [reinicio]);

  // Altura reservada: evita saltos de diseño (CLS) cuando aparece el widget.
  return <div ref={contenedor} className="min-h-[65px]" />;
}
