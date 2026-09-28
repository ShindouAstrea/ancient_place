import { siteConfig } from "@/config/site";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { enlaceWhatsapp } from "@/lib/utils/contacto";

/** Botón flotante de WhatsApp, visible en todas las páginas públicas. */
export function WhatsappFlotante() {
  const { contacto } = siteConfig;
  return (
    // <aside> con etiqueta: todo el contenido queda dentro de una región identificable.
    <aside aria-label="Contacto rápido">
      <a
        href={enlaceWhatsapp(contacto.whatsapp, contacto.mensajeWhatsappPorDefecto)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp (se abre en una pestaña nueva)"
        // Respeta el área segura inferior de iPhone (barra de inicio).
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex size-16 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg ring-4 ring-white/70 transition-colors hover:bg-whatsapp-oscuro sm:right-6 sm:bottom-6"
      >
        <IconoWhatsapp className="size-9" />
      </a>
    </aside>
  );
}
