"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Boton, clasesBoton } from "@/components/ui/boton";
import { CampoCasilla, CampoTexto } from "@/components/ui/campo";
import { DESCRIPCIONES_ROL, NOMBRES_ROL, type RolAdmin } from "@/config/admin";
import { crearCuentaAccion, guardarCuentaAccion } from "@/server/actions/usuarios";
import { erroresPorCampo } from "@/server/validators/contacto";
import {
  CAMPOS_CUENTA,
  ROLES,
  cuentaDesdeFormulario,
  esquemaEdicionCuenta,
  esquemaNuevaCuenta,
  type EstadoCuenta,
} from "@/server/validators/usuarios";

import { ContrasenaTemporal } from "./contrasena-temporal";

const INICIAL: EstadoCuenta = { estado: "inicial" };

type CuentaEditable = { id: string; nombre: string; roles: RolAdmin[] };

type Props = {
  /** null: cuenta nueva (correo, nombre y permisos). */
  cuenta: CuentaEditable | null;
  /** La cuenta es la de quien está editando: no puede quitarse el rol "usuarios". */
  propia?: boolean;
};

function enfocarPrimerError(errores: Partial<Record<string, string>>) {
  const campo = CAMPOS_CUENTA.find((c) => errores[c]);
  // El error de permisos se muestra junto al grupo: el foco va a la primera casilla.
  if (campo === "roles") document.getElementById(`rol-${ROLES[0]}`)?.focus();
  else if (campo) document.getElementById(campo)?.focus();
}

/** Crear una cuenta (con su contraseña temporal) o editar el nombre y los permisos. */
export function FormularioCuenta({ cuenta, propia = false }: Props) {
  const [estado, enviar, guardando] = useActionState(
    cuenta ? guardarCuentaAccion.bind(null, cuenta.id) : crearCuentaAccion,
    INICIAL,
  );
  const [erroresCliente, setErroresCliente] = useState<Partial<Record<string, string>> | null>(
    null,
  );
  const refAlerta = useRef<HTMLDivElement>(null);

  const errores = erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const mensajeGeneral = estado.estado === "error" && !estado.errores ? estado.mensaje : null;

  useEffect(() => {
    if (estado.estado !== "error") return;
    if (estado.errores) enfocarPrimerError(estado.errores);
    else refAlerta.current?.focus();
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const formData = new FormData(evento.currentTarget);
    const validacion = (cuenta ? esquemaEdicionCuenta : esquemaNuevaCuenta).safeParse(
      cuentaDesdeFormulario(formData),
    );
    if (!validacion.success) {
      const nuevos = erroresPorCampo<string>(validacion.error);
      setErroresCliente(nuevos);
      enfocarPrimerError(nuevos);
      return;
    }
    setErroresCliente(null);
    startTransition(() => enviar(formData));
  }

  // Cuenta creada: la contraseña temporal, una sola vez, y qué hacer después.
  if (estado.estado === "exito" && estado.contrasena && estado.creada) {
    const { creada } = estado;
    return (
      <div className="space-y-6">
        <p
          role="status"
          className="flex gap-2 rounded-xl bg-salvia-100 p-4 font-semibold text-salvia-900"
        >
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Cuenta creada para {creada.nombre}.
        </p>
        <ContrasenaTemporal
          contrasena={estado.contrasena}
          email={creada.email}
          nombre={creada.nombre}
        />
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/usuarios/${creada.id}`} className={clasesBoton()}>
            Ver la cuenta
          </Link>
          <Link href="/admin/usuarios" className={clasesBoton({ variante: "secundario" })}>
            Volver a usuarios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={guardando} className="space-y-6">
      <div className="grid gap-5 rounded-2xl border border-salvia-200 bg-white p-4 sm:grid-cols-2 sm:p-6">
        {cuenta ? null : (
          <CampoTexto
            id="email"
            etiqueta="Correo electrónico"
            ayuda="Con este correo ingresará. No se puede cambiar después."
            type="email"
            inputMode="email"
            autoComplete="off"
            maxLength={254}
            error={errores.email}
          />
        )}
        <CampoTexto
          id="nombre"
          etiqueta="Nombre"
          ayuda="Para reconocer la cuenta en esta lista."
          autoComplete="off"
          maxLength={100}
          defaultValue={cuenta?.nombre ?? ""}
          error={errores.nombre}
        />
      </div>

      <fieldset
        aria-describedby={errores.roles ? "roles-error" : undefined}
        className="space-y-4 rounded-2xl border border-salvia-200 bg-white p-4 sm:p-6"
      >
        <legend className="px-1 font-serif text-xl font-semibold">Permisos</legend>
        <p className="text-base text-tinta-suave">
          Marca solo lo que la persona necesita para su trabajo.
        </p>
        {ROLES.map((rol) => {
          // Nadie puede quitarse a sí mismo el permiso de administrar usuarios: la casilla
          // deshabilitada no se envía, así que va un campo oculto con el valor.
          const fijo = propia && rol === "usuarios";
          return (
            <div key={rol}>
              <CampoCasilla
                id={`rol-${rol}`}
                name="roles"
                value={rol}
                defaultChecked={cuenta?.roles.includes(rol) ?? false}
                disabled={fijo}
              >
                <span className="block font-semibold">{NOMBRES_ROL[rol]}</span>
                <span className="block text-tinta-suave">
                  {DESCRIPCIONES_ROL[rol]}
                  {fijo ? " No puedes quitártelo a ti mismo." : null}
                </span>
              </CampoCasilla>
              {fijo ? <input type="hidden" name="roles" value={rol} /> : null}
            </div>
          );
        })}
        {errores.roles ? (
          <p id="roles-error" className="text-base font-semibold text-terracota">
            {errores.roles}
          </p>
        ) : null}
      </fieldset>

      <div ref={refAlerta} tabIndex={-1} role="alert" className="outline-none">
        {mensajeGeneral ? (
          <p className="flex gap-3 rounded-xl border-2 border-terracota bg-white p-4 text-base">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
            {mensajeGeneral}
          </p>
        ) : null}
        {cuenta && estado.estado === "exito" && !erroresCliente ? (
          <p className="flex gap-2 rounded-xl bg-salvia-100 p-4 font-semibold text-salvia-900">
            <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            {estado.mensaje}
          </p>
        ) : null}
      </div>

      <Boton type="submit" tamano="grande" disabled={guardando} className="w-full sm:w-auto">
        {guardando ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {cuenta ? "Guardando…" : "Creando…"}
          </>
        ) : cuenta ? (
          <>
            <Save className="size-5" aria-hidden="true" />
            Guardar cambios
          </>
        ) : (
          <>
            <UserPlus className="size-5" aria-hidden="true" />
            Crear cuenta
          </>
        )}
      </Boton>
    </form>
  );
}
