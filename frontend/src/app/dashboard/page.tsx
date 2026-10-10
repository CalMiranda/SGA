"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import SGANav from "@/components/SGANav";

type Persona = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
};

type Horario = {
  id: number;
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  tolerancia_minutos: number;
};

type Asistencia = {
  id: number;
  persona: number;
  persona_codigo: string;
  persona_nombre: string;
  horario: number;
  horario_nombre: string;
  fecha: string;
  hora_registro: string;
  estado: string;
  estado_display: string;
  observacion: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export default function DashboardPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [
        responsePersonas,
        responseHorarios,
        responseAsistencias,
      ] = await Promise.all([
        fetch(`${API_URL}/api/personas/`, {
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/horarios/`, {
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/asistencias/`, {
          cache: "no-store",
        }),
      ]);

      if (
        !responsePersonas.ok ||
        !responseHorarios.ok ||
        !responseAsistencias.ok
      ) {
        throw new Error();
      }

      const dataPersonas: Persona[] =
        await responsePersonas.json();

      const dataHorarios: Horario[] =
        await responseHorarios.json();

      const dataAsistencias: Asistencia[] =
        await responseAsistencias.json();

      setPersonas(dataPersonas);
      setHorarios(dataHorarios);
      setAsistencias(dataAsistencias);
    } catch {
      setError(
        "No fue posible cargar la información del dashboard."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  const fechaHoy = useMemo(() => {
    const fecha = new Date();

    const anio = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
      fecha.getDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }, []);

  const asistenciasHoy = useMemo(
    () =>
      asistencias.filter(
        (registro) => registro.fecha === fechaHoy
      ),
    [asistencias, fechaHoy]
  );

  const presentes = asistenciasHoy.filter(
    (registro) => registro.estado === "presente"
  ).length;

  const tardanzas = asistenciasHoy.filter(
    (registro) => registro.estado === "tardanza"
  ).length;

  const ausencias = asistenciasHoy.filter(
    (registro) => registro.estado === "ausencia"
  ).length;

  const justificadas = asistenciasHoy.filter(
    (registro) => registro.estado === "justificada"
  ).length;

  const personasActivas = personas.filter(
    (persona) => persona.activo
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        color: "#0f172a",
      }}
    >
      <header
        style={{
          background: "#0f1b35",
          color: "white",
          padding: "28px 32px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            Sistema de Gestión de Asistencia
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#cbd5e1",
              fontSize: "17px",
            }}
          >
            Dashboard
          </p>
        </div>
      </header>

      <SGANav />

      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "40px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "28px",
              }}
            >
              Resumen general
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748b",
              }}
            >
              Información obtenida directamente desde
              los módulos del SGA.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarDashboard}
            style={{
              padding: "11px 18px",
              background: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "9px",
              cursor: "pointer",
            }}
          >
            Actualizar
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "15px",
              marginBottom: "24px",
              borderRadius: "10px",
              background: "#fef2f2",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        {cargando ? (
          <div
            style={{
              padding: "40px",
              background: "white",
              borderRadius: "16px",
            }}
          >
            Cargando información...
          </div>
        ) : (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "20px",
                marginBottom: "28px",
              }}
            >
              <Tarjeta
                titulo="Personas registradas"
                valor={personas.length}
                detalle={`${personasActivas} activas`}
              />

              <Tarjeta
                titulo="Horarios configurados"
                valor={horarios.length}
                detalle="Horarios disponibles"
              />

              <Tarjeta
                titulo="Registros de asistencia"
                valor={asistencias.length}
                detalle="Total acumulado"
              />
            </section>

            <section
              style={{
                background: "white",
                padding: "28px",
                borderRadius: "16px",
                boxShadow:
                  "0 2px 8px rgba(15, 23, 42, 0.08)",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  marginBottom: "22px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "24px",
                  }}
                >
                  Asistencia de hoy
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#64748b",
                  }}
                >
                  {formatearFecha(fechaHoy)}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "18px",
                }}
              >
                <TarjetaEstado
                  titulo="Presentes"
                  valor={presentes}
                  tipo="presente"
                />

                <TarjetaEstado
                  titulo="Tardanzas"
                  valor={tardanzas}
                  tipo="tardanza"
                />

                <TarjetaEstado
                  titulo="Ausencias"
                  valor={ausencias}
                  tipo="ausencia"
                />

                <TarjetaEstado
                  titulo="Justificadas"
                  valor={justificadas}
                  tipo="justificada"
                />
              </div>
            </section>

            <section
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "28px",
                boxShadow:
                  "0 2px 8px rgba(15, 23, 42, 0.08)",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "6px",
                  fontSize: "24px",
                }}
              >
                Registros recientes
              </h2>

              <p
                style={{
                  marginTop: 0,
                  marginBottom: "22px",
                  color: "#64748b",
                }}
              >
                Últimos registros de asistencia
                almacenados en el sistema.
              </p>

              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        borderBottom:
                          "1px solid #e2e8f0",
                        color: "#475569",
                      }}
                    >
                      <th style={thStyle}>Fecha</th>
                      <th style={thStyle}>Hora</th>
                      <th style={thStyle}>Persona</th>
                      <th style={thStyle}>Horario</th>
                      <th style={thStyle}>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {asistencias
                      .slice(0, 5)
                      .map((registro) => (
                        <tr
                          key={registro.id}
                          style={{
                            borderBottom:
                              "1px solid #f1f5f9",
                          }}
                        >
                          <td style={tdStyle}>
                            {formatearFecha(
                              registro.fecha
                            )}
                          </td>

                          <td style={tdStyle}>
                            {registro.hora_registro.substring(
                              0,
                              5
                            )}
                          </td>

                          <td style={tdStyle}>
                            <strong>
                              {registro.persona_nombre}
                            </strong>

                            <div
                              style={{
                                color: "#64748b",
                                fontSize: "13px",
                              }}
                            >
                              {registro.persona_codigo}
                            </div>
                          </td>

                          <td style={tdStyle}>
                            {registro.horario_nombre}
                          </td>

                          <td style={tdStyle}>
                            {registro.estado_display}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: number;
  detalle: string;
}) {
  return (
    <div
      style={{
        background: "white",
        padding: "24px",
        borderRadius: "16px",
        boxShadow:
          "0 2px 8px rgba(15, 23, 42, 0.08)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontWeight: 600,
        }}
      >
        {titulo}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: "10px",
          fontSize: "36px",
        }}
      >
        {valor}
      </strong>

      <span
        style={{
          color: "#64748b",
          fontSize: "14px",
        }}
      >
        {detalle}
      </span>
    </div>
  );
}

function TarjetaEstado({
  titulo,
  valor,
  tipo,
}: {
  titulo: string;
  valor: number;
  tipo: string;
}) {
  const estilos: Record<
    string,
    {
      background: string;
      color: string;
    }
  > = {
    presente: {
      background: "#ecfdf5",
      color: "#15803d",
    },
    tardanza: {
      background: "#fffbeb",
      color: "#b45309",
    },
    ausencia: {
      background: "#fef2f2",
      color: "#b91c1c",
    },
    justificada: {
      background: "#eff6ff",
      color: "#1d4ed8",
    },
  };

  const estilo =
    estilos[tipo] || estilos.justificada;

  return (
    <div
      style={{
        padding: "22px",
        borderRadius: "14px",
        background: estilo.background,
      }}
    >
      <span
        style={{
          fontWeight: 600,
          color: estilo.color,
        }}
      >
        {titulo}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: "8px",
          fontSize: "32px",
          color: estilo.color,
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

function formatearFecha(fecha: string) {
  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

const thStyle = {
  padding: "14px",
  fontWeight: 600,
} as const;

const tdStyle = {
  padding: "16px 14px",
} as const;