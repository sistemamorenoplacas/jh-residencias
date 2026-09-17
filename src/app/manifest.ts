import type { MetadataRoute } from "next";

/**
 * Web App Manifest — permite instalar o painel como app no celular
 * (Adicionar à tela inicial / PWA). O Next serve isto em
 * `/manifest.webmanifest` e injeta o <link> automaticamente.
 *
 * Ícones em `public/`: icon-192.png, icon-512.png e icon-512-maskable.png
 * (gerados de `src/app/icon.png`; o maskable tem margem navy de 20%).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JH Residências — Gestão de Aluguéis",
    short_name: "JH Residências",
    description: "Painel de gestão de aluguéis, contratos e cobranças.",
    start_url: "/painel",
    display: "standalone",
    // Splash navy (mesma cor do topo do app), não a tela clara.
    background_color: "#052351",
    theme_color: "#052351",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
