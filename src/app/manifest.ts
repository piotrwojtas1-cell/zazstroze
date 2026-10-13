import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zielony Zakątek — karta stałego klienta",
    short_name: "Zielony Zakątek",
    description: "Cyfrowa karta lojalnościowa, punkty, nagrody i porady ogrodnicze.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F6F0",
    theme_color: "#1B3B2F",
    lang: "pl",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [{ name: "Pokaż kartę", url: "/karta", description: "Kod QR do zeskanowania przy kasie" }],
  };
}
