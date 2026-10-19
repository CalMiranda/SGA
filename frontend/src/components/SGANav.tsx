"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const opciones = [
  {
    nombre: "Dashboard",
    ruta: "/dashboard",
  },
  {
    nombre: "Personas",
    ruta: "/",
  },
  {
    nombre: "Horarios",
    ruta: "/horarios",
  },
  {
    nombre: "Asistencia",
    ruta: "/asistencias",
  },
  {
    nombre: "Incidencias",
    ruta: "/incidencias",
  },
];

export default function SGANav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "#0f1b35",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {opciones.map((opcion) => {
          const activo =
            opcion.ruta === "/"
              ? pathname === "/"
              : pathname.startsWith(opcion.ruta);

          return (
            <Link
              key={opcion.ruta}
              href={opcion.ruta}
              style={{
                display: "block",
                padding: "14px 18px",
                textDecoration: "none",
                borderRadius: "8px 8px 0 0",
                fontWeight: 600,
                color: activo ? "#ffffff" : "#cbd5e1",
                background: activo
                  ? "#1e3a68"
                  : "transparent",
              }}
            >
              {opcion.nombre}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}