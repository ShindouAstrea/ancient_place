import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { WhatsappFlotante } from "@/components/sections/whatsapp-flotante";
import { obtenerContenidoSitio } from "@/server/services/contenido";

/**
 * Páginas públicas ESTÁTICAS (rápidas y cacheables). Se regeneran solas:
 * - al guardar cambios en el panel (revalidatePath en server/services/contenido.ts);
 * - y, como respaldo, cada hora.
 */
export const revalidate = 3600;

/** Layout de las páginas públicas: header, contenido, footer y WhatsApp flotante. */
export default async function PublicoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const contenido = await obtenerContenidoSitio();

  return (
    <>
      {/* Permite a usuarios de teclado saltar directamente al contenido. */}
      <a
        href="#contenido"
        className="sr-only z-50 rounded-full bg-salvia-800 px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <Header contenido={contenido} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer config={contenido.config} />
      <WhatsappFlotante config={contenido.config} />
    </>
  );
}
