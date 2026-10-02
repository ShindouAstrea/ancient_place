"use client";

import { useEffect } from "react";

import { descartarCredencial, ofrecerCredencialPendiente } from "@/lib/utils/recordar-acceso";

/**
 * Al llegar al panel tras un ingreso exitoso con «Recordar mis datos», pide al navegador
 * guardar la contraseña. Con una contraseña temporal no se ofrece: se reemplaza enseguida
 * (el formulario de «Mi cuenta» ofrece guardar la nueva).
 */
export function OfrecerCredencial({ contrasenaTemporal }: { contrasenaTemporal: boolean }) {
  useEffect(() => {
    if (contrasenaTemporal) descartarCredencial();
    else void ofrecerCredencialPendiente();
  }, [contrasenaTemporal]);
  return null;
}
