import type { Metadata } from "next";
import "./globals.css";
import SessionGuard from "@/components/SessionGuard";

export const metadata: Metadata = {
  title: "SGA | Sistema de Gestión de Asistencia",
  description: "Sistema web para administrar la asistencia institucional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionGuard>{children}</SessionGuard>
      </body>
    </html>
  );
}
