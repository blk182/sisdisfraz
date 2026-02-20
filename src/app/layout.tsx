import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SisDisfraz Perú",
  description: "Sistema de Alquiler de Disfraces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
