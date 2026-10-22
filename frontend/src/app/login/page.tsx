"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch(
        "/api/auth/login/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: identifier.trim(), password }),
        },
        false,
      );

      if (response.status === 429) {
        setError("Se alcanzó el límite de intentos. Espera un minuto e inténtalo de nuevo.");
        return;
      }
      if (response.status === 403) {
        setError("Tu cuenta no tiene un rol habilitado. Solicita acceso al administrador del SGA.");
        return;
      }
      if (!response.ok) {
        setError("No se pudo iniciar sesión. Verifica tus credenciales.");
        return;
      }

      const payload = await response.json();
      const roles: string[] = payload?.user?.roles ?? [];
      router.replace(roles.includes("Empleado / Estudiante") ? "/mi-historial" : "/dashboard");
    } catch {
      setError("No fue posible conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-brand-side">
        <div className="login-brand-content">
          <div className="login-logo">
            <span className="brand-mark"><GraduationCap /></span>
            <div>
              <strong>SGA</strong>
              <span>Sistema de Gestión<br />de Asistencia</span>
            </div>
          </div>

          <p className="login-brand-intro">
            Accede a la plataforma institucional para administrar asistencia,
            horarios e incidencias desde un solo lugar.
          </p>

          <div className="login-features">
            <Feature icon="people" title="Gestión de asistencia">
              Registra y consulta la asistencia institucional.
            </Feature>
            <Feature icon="calendar" title="Horarios">
              Organiza horarios y controla la tolerancia de entrada.
            </Feature>
            <Feature icon="file" title="Incidencias y reportes">
              Da seguimiento a incidencias y revisa información registrada.
            </Feature>
          </div>
        </div>

        <div className="login-brand-footer">
          <strong>Universidad Nacional de Ingeniería</strong>
          <span>Sistema institucional de gestión de asistencia</span>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-card">
          <div className="login-heading">
            <h1>Iniciar sesión</h1>
            <p>Ingresa tus credenciales institucionales para continuar</p>
          </div>

          <form onSubmit={iniciarSesion} className="login-form">
            <div className="login-field">
              <label htmlFor="identifier">Correo o usuario institucional</label>
              <div className="login-input-wrap">
                <Icon name="mail" size={19} />
                <input
                  id="identifier"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="login-input"
                  placeholder="tu.usuario@uni.edu.ni"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrap">
                <Icon name="lock" size={19} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="login-input"
                  placeholder="Ingresa tu contraseña"
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <Icon name={showPassword ? "eyeoff" : "eye"} size={18} />
                </button>
              </div>
            </div>

            <p className="login-help">
              ¿Necesitas restablecer tu contraseña? Solicítalo al administrador del sistema.
            </p>

            {error && <p className="alert alert-error" role="alert">{error}</p>}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? "Validando acceso..." : "Ingresar"}
              {!loading && <Icon name="arrow" size={18} />}
            </button>
          </form>

          <p className="login-legal">
            El acceso se limita a cuentas institucionales autorizadas. Si aún no tienes
            una cuenta, solicita al administrador que la habilite.
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, children }: { icon: string; title: string; children: string }) {
  return (
    <div className="login-feature">
      <span className="login-feature-icon"><Icon name={icon} size={23} /></span>
      <span><strong>{title}</strong><small>{children}</small></span>
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
