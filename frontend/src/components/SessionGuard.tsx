"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SGAAccessContext, type SGAUser } from "@/lib/access";
import { apiFetch } from "@/lib/api";

export default function SessionGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [verifiedPath, setVerifiedPath] = useState<string | null>(pathname === "/login" ? "/login" : null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [user, setUser] = useState<SGAUser | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;

    let active = true;
    apiFetch("/api/auth/me/")
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("No se pudo validar la sesión.");
        const payload = await response.json();
        if (!active) return;
        const currentUser = payload.user ?? null;
        const roles: string[] = currentUser?.roles ?? [];
        const isEmployee = roles.includes("Empleado / Estudiante");
        const isAdministrator = Boolean(currentUser?.is_superuser || roles.includes("Administrador"));
        const canReadAudit = isAdministrator || roles.includes("Auditor / Dirección");

        if (isEmployee && pathname !== "/mi-historial") {
          router.replace("/mi-historial");
          return;
        }
        if (!isEmployee && pathname === "/mi-historial") {
          router.replace("/dashboard");
          return;
        }
        if (pathname === "/configuracion" && !isAdministrator) {
          router.replace(isEmployee ? "/mi-historial" : "/dashboard");
          return;
        }
        if (pathname === "/auditoria" && !canReadAudit) {
          router.replace(isEmployee ? "/mi-historial" : "/dashboard");
          return;
        }

        setUser(currentUser);
        setVerifiedPath(pathname);
        setState("ready");
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setVerifiedPath(pathname);
          setState("error");
        }
      });

    return () => { active = false; };
  }, [pathname, router]);

  if (pathname === "/login") return children;
  if (verifiedPath === pathname && state === "ready") {
    const canWrite = Boolean(user?.is_superuser || user?.roles?.some((role) => role === "Administrador" || role === "Gestor de asistencia"));
    return (
      <SGAAccessContext.Provider value={{ user, canWrite }}>
        {children}
      </SGAAccessContext.Provider>
    );
  }

  if (verifiedPath === pathname && state === "error") {
    return (
      <main className="guard-state">
        <section className="guard-card">
          <h1>No se pudo validar la sesión</h1>
          <p>Revisa la conexión con el servidor e inténtalo de nuevo.</p>
          <button type="button" onClick={() => window.location.reload()}>Reintentar</button>
        </section>
      </main>
    );
  }

  return <main className="guard-state" role="status">Validando acceso al SGA...</main>;
}
