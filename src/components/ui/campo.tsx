import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Controles de formulario accesibles. Cada campo:
 * - tiene una etiqueta visible asociada (htmlFor/id),
 * - enlaza la ayuda y el error con aria-describedby,
 * - marca aria-invalid cuando hay error,
 * - usa texto de 18px (evita además el zoom automático de iOS, que ocurre bajo 16px).
 */

export const claseControl =
  "block w-full rounded-xl border-2 border-salvia-300 bg-white px-4 py-3 text-lg text-tinta " +
  "placeholder:text-tinta-suave/70 focus:border-salvia-700 focus-visible:outline-offset-1 " +
  "aria-invalid:border-terracota min-h-12";

/** Como claseControl, con menos relleno lateral: dos horas caben lado a lado en 360 px. */
export const claseHora =
  "block w-full min-w-0 min-h-12 rounded-xl border-2 border-salvia-300 bg-white px-2 py-3 " +
  "text-lg text-tinta tabular-nums focus:border-salvia-700 focus-visible:outline-offset-1 " +
  "aria-invalid:border-terracota";

type BaseCampo = {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  opcional?: boolean;
};

function Envoltorio({
  id,
  etiqueta,
  ayuda,
  error,
  opcional,
  children,
}: BaseCampo & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {etiqueta}
        {opcional ? <span className="font-normal text-tinta-suave"> (opcional)</span> : null}
      </label>
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-base text-tinta-suave">
          {ayuda}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-base font-semibold text-terracota">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy({ id, ayuda, error }: BaseCampo) {
  const ids = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function CampoTexto({
  id,
  etiqueta,
  ayuda,
  error,
  opcional,
  className,
  ...props
}: BaseCampo & Omit<ComponentProps<"input">, "id">) {
  const campo = { id, etiqueta, ayuda, error, opcional };
  return (
    <Envoltorio {...campo}>
      <input
        id={id}
        name={id}
        required={!opcional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(campo)}
        className={cn(claseControl, className)}
        {...props}
      />
    </Envoltorio>
  );
}

export function CampoAreaTexto({
  id,
  etiqueta,
  ayuda,
  error,
  opcional,
  className,
  ...props
}: BaseCampo & Omit<ComponentProps<"textarea">, "id">) {
  const campo = { id, etiqueta, ayuda, error, opcional };
  return (
    <Envoltorio {...campo}>
      <textarea
        id={id}
        name={id}
        required={!opcional}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(campo)}
        className={cn(claseControl, "resize-y", className)}
        {...props}
      />
    </Envoltorio>
  );
}

export function CampoSeleccion({
  id,
  etiqueta,
  ayuda,
  error,
  opcional,
  opciones,
  className,
  ...props
}: BaseCampo &
  Omit<ComponentProps<"select">, "id"> & {
    /** Texto (valor = etiqueta) o { valor, etiqueta } cuando difieren. */
    opciones: readonly (string | { valor: string; etiqueta: string })[];
  }) {
  const campo = { id, etiqueta, ayuda, error, opcional };
  return (
    <Envoltorio {...campo}>
      <select
        id={id}
        name={id}
        required={!opcional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(campo)}
        className={cn(claseControl, className)}
        defaultValue=""
        {...props}
      >
        <option value="">Selecciona una opción</option>
        {opciones.map((opcion) => {
          const { valor, etiqueta: texto } =
            typeof opcion === "string" ? { valor: opcion, etiqueta: opcion } : opcion;
          return (
            <option key={valor} value={valor}>
              {texto}
            </option>
          );
        })}
      </select>
    </Envoltorio>
  );
}

export function CampoCasilla({
  id,
  error,
  children,
  className,
  ...props
}: { id: string; error?: string; children: ReactNode } & Omit<
  ComponentProps<"input">,
  "id" | "type" | "children"
>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        {/* La casilla mide 28px, pero toda la etiqueta es clicable: zona táctil amplia. */}
        <input
          type="checkbox"
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("mt-0.5 size-7 shrink-0 accent-salvia-700", className)}
          {...props}
        />
        <label htmlFor={id} className="min-h-11 text-base">
          {children}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-base font-semibold text-terracota">
          {error}
        </p>
      ) : null}
    </div>
  );
}
