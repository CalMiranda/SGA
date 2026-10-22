"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import { useSGAAccess } from "@/lib/access";
import { apiFetch } from "@/lib/api";

type ShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
};

const operationalItems = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Personas", href: "/personas", icon: "people" },
  { label: "Horarios", href: "/horarios", icon: "calendar" },
  { label: "Asistencia", href: "/asistencias", icon: "check" },
  { label: "Incidencias", href: "/incidencias", icon: "alert" },
  { label: "Reportes", href: "/reportes", icon: "chart" },
];

export default function AppShell({
  title,
  subtitle,
  children,
  actions,
}: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSGAAccess();
  const isEmployee = Boolean(user?.roles?.includes("Empleado / Estudiante"));
  const isAdministrator = Boolean(user?.is_superuser || user?.roles?.includes("Administrador"));
  const canReadAudit = Boolean(isAdministrator || user?.roles?.includes("Auditor / Dirección"));
  const visibleItems = isEmployee
    ? [{ label: "Mi historial", href: "/mi-historial", icon: "clock" }]
    : [
        ...operationalItems,
        ...(canReadAudit ? [{ label: "Auditoría", href: "/auditoria", icon: "audit" }] : []),
        ...(isAdministrator ? [{ label: "Configuración", href: "/configuracion", icon: "settings" }] : []),
      ];
  const [pendingCount, setPendingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (!user || isEmployee) return;
    let active = true;
    Promise.all([
      apiFetch("/api/incidencias/"),
      apiFetch("/api/justificaciones/"),
    ])
      .then(async ([incidentsResponse, justificationsResponse]) => {
        if (!active) return;
        if (incidentsResponse.ok && justificationsResponse.ok) {
          const [incidents, justifications] = await Promise.all([
            incidentsResponse.json(),
            justificationsResponse.json(),
          ]);
          const incidentsPending = Array.isArray(incidents)
            ? incidents.filter((item) => item.estado === "pendiente").length
            : 0;
          const justificationsPending = Array.isArray(justifications)
            ? justifications.filter((item) => item.estado === "pendiente").length
            : 0;
          setPendingCount(incidentsPending + justificationsPending);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [isEmployee, user]);

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    router.push(value ? `/personas?buscar=${encodeURIComponent(value)}` : "/personas");
  }

  async function cerrarSesion() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await apiFetch("/api/auth/logout/", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch {
      setLogoutError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      setLoggingOut(false);
    }
  }

  const initials = user?.username
    ? user.username
        .split(/[.@\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toLocaleUpperCase())
        .join("")
    : "SG";
  const roleLabel = user?.roles?.length ? user.roles.join(" · ") : "Usuario SGA";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand-lockup" href={isEmployee ? "/mi-historial" : "/dashboard"} aria-label="SGA, ir al inicio">
          <span className="brand-mark"><GraduationCap /></span>
          <span className="brand-copy">
            <strong>SGA</strong>
            <small>Sistema de Gestión<br />de Asistencia</small>
          </span>
        </Link>

        <nav className="side-nav" aria-label="Navegación principal">
          <span className="nav-caption">{isEmployee ? "AUTOSERVICIO" : "MENÚ PRINCIPAL"}</span>
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={`side-link${active ? " active" : ""}`}
                href={item.href}
                key={item.href}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}

        </nav>

        <div className="sidebar-footer">
          <div className="uni-mark" aria-hidden="true"><UniversityMark /></div>
          <strong>Universidad Nacional<br />de Ingeniería</strong>
          <span>Sistema institucional · UNI</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-heading">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {actions && <div className="page-heading-actions">{actions}</div>}
          </div>
          {!isEmployee && <form className="top-search" onSubmit={buscar} role="search">
              <Icon name="search" />
              <input
                aria-label="Buscar personas"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar personas por nombre o código..."
              />
              <button type="submit" className="search-submit">Buscar</button>
            </form>}

          <div className="topbar-actions">
            {!isEmployee && <Link className="notification-button" href="/incidencias" aria-label={`Incidencias pendientes: ${pendingCount}`}>
              <Icon name="bell" />
              {pendingCount > 0 && <span className="notification-count">{pendingCount > 99 ? "99+" : pendingCount}</span>}
            </Link>}
            {!isEmployee && <span className="topbar-divider" />}
            <details className="profile-control">
              <summary className="profile-summary">
                <span className="avatar">{initials}</span>
                <span className="profile-copy">
                  <strong>{user?.username ?? "Cuenta SGA"}</strong>
                  <small>{roleLabel}</small>
                </span>
                <Icon name="chevron" />
              </summary>
              <div className="profile-menu">
                <span className="profile-menu-label">Sesión actual</span>
                <strong>{user?.username ?? "Usuario autorizado"}</strong>
                <small>{roleLabel}</small>
                <button type="button" onClick={cerrarSesion} disabled={loggingOut}>
                  <Icon name="logout" />
                  {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </button>
              </div>
            </details>
            {!isEmployee && <span className="date-chip"><Icon name="calendar" />{new Intl.DateTimeFormat("es-NI", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date())}</span>}
          </div>
        </header>

        <main className="content-area">
          {logoutError && <div className="alert alert-error" role="alert">{logoutError}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}

function GraduationCap() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="m3 17 21-11 21 11-21 11L3 17Z" fill="currentColor" />
      <path d="M11 22v11c7 7 19 7 26 0V22L24 30 11 22Z" fill="currentColor" />
      <path d="M42 20v12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="35" r="3" fill="currentColor" />
    </svg>
  );
}

function UniversityMark() {
  return (
    <svg viewBox="0 0 48 42" fill="none" aria-hidden="true">
      <path d="M4 15 24 4l20 11H4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 18h32M11 18v16m9-16v16m9-16v16m9-16v16M6 36h36M3 40h42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3m-3 3h6" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    alert: <><path d="m10.3 3.8-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.2l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /><path d="M15 9h4v4" /></>,
    audit: <><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" /><path d="M8 3v4h4M8 11h6M8 15h4M14 4h7v7h-7z" /><path d="m16 7 1.2 1.2L19.5 6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 1.4 1.1-1.4 2.4-1.7-.6a7.7 7.7 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a7.7 7.7 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.2 15a7.7 7.7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a7.7 7.7 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a7.7 7.7 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7.7 7.7 0 0 1 0 2Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeoff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a14 14 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.1 0 2.1-.2 3-.6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    filter: <><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15v5Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 11.7-2L20 12M4 12l2.8 5a7 7 0 0 0 11.7-2" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.file}
    </svg>
  );
}
