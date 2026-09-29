import type { Metadata } from "next";

import { EnlaceNoValido, FormularioRestablecer } from "@/components/admin/formulario-restablecer";
import { Tarjeta } from "@/components/ui/tarjeta";
import { esquemaTokenRecuperacion } from "@/server/validators/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Destino del enlace del correo de recuperación. Abrirlo (GET) no cambia nada: el token
 * se canjea recién al enviar la nueva contraseña. Así, los filtros de seguridad de
 * algunos correos, que abren los enlaces para revisarlos, no lo gastan antes que la persona.
 */
export default async function RestablecerPage({ searchParams }: Props) {
  const { token_hash: tokenHash } = await searchParams;
  const token = esquemaTokenRecuperacion.safeParse(tokenHash);

  return (
    <Tarjeta>
      {token.success ? <FormularioRestablecer tokenHash={token.data} /> : <EnlaceNoValido />}
    </Tarjeta>
  );
}
