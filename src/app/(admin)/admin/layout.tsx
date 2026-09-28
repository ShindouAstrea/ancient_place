import type { Metadata } from "next";

/**
 * Raíz de todas las rutas /admin (acceso y panel).
 * noindex en tres capas: esta metadata, la cabecera X-Robots-Tag (next.config.ts)
 * y robots.txt (etapa 6).
 */
export const metadata: Metadata = {
  title: { default: "Panel de administración", template: "%s · Panel de administración" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh bg-salvia-50">{children}</div>;
}
