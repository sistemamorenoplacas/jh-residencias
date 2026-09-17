import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/** Grotesca display com caráter — títulos e algarismos-herói (terminal financeiro). */
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/** Grotesca limpa e levemente quente — corpo, navegação, rótulos. */
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/** Mono tabular — algarismos monetários alinhados em tabelas. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "JH Residências",
  description: "Cobrança de aluguel — painel administrativo",
  // Ícones vêm da convenção de arquivo do Next: src/app/icon.png e
  // src/app/apple-icon.png. Não declarar `icons` aqui evita conflito.
  // `black-translucent`: no app instalado a página corre por baixo da status
  // bar (texto branco) — o topo navy do celular preenche essa área via
  // env(safe-area-inset-top) em dashboard.css e na tela de login.
  appleWebApp: { capable: true, title: "JH Residências", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#052351",
  width: "device-width",
  initialScale: 1,
  // Sem isto o Safari reserva uma faixa cinza no topo em vez de deixar a
  // página ocupar a tela toda (notch/Dynamic Island e status bar).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolage.variable} ${hanken.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
