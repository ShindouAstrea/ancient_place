import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { WhatsappFlotante } from "@/components/sections/whatsapp-flotante";

/** Layout de las páginas públicas: header, contenido, footer y WhatsApp flotante. */
export default function PublicoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Permite a usuarios de teclado saltar directamente al contenido. */}
      <a
        href="#contenido"
        className="sr-only z-50 rounded-full bg-salvia-800 px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <WhatsappFlotante />
    </>
  );
}
