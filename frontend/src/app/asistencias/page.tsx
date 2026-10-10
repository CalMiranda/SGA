"use client";

import SGANav from "@/components/SGANav";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

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
  fecha_creacion: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export default function AsistenciasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);

  const [persona, setPersona] = useState("");
  const [horario, setHorario] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaRegistro, setHoraRegistro] = useState("");
  const [estado, setEstado] = useState("presente");
  const [observacion, setObservacion] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarDatos = useCallback(async () => {
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

      setPersonas(
        dataPersonas.filter((persona) => persona.activo)
      );

      setHorarios(dataHorarios);
      setAsistencias(dataAsistencias);
    } catch {
      setError(
        "No fue posible obtener la información del backend."
      );
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function registrarAsistencia(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setError("");

    if (
      !persona ||
      !horario ||
      !fecha ||
      !horaRegistro ||
      !estado
    ) {
      setError(
        "Completa todos los campos obligatorios."
      );
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(
        `${API_URL}/api/asistencias/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            persona: Number(persona),
            horario: Number(horario),
            fecha,
            hora_registro: horaRegistro,
            estado,
            observacion: observacion.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.non_field_errors) {
          setError(data.non_field_errors[0]);
        } else if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          setError(data[0]);
        } else if (typeof data === "object") {
          const primerError = Object.values(data)[0];

          if (Array.isArray(primerError)) {
            setError(String(primerError[0]));
          } else {
            setError(
              "No fue posible registrar la asistencia."
            );
          }
        } else {
          setError(
            "No fue posible registrar la asistencia."
          );
        }

        return;
      }

      setPersona("");
      setHorario("");
      setFecha("");
      setHoraRegistro("");
      setEstado("presente");
      setObservacion("");

      setMensaje(
        "Asistencia registrada correctamente."
      );

      await cargarDatos();
    } catch {
      setError(
        "No se pudo conectar con el backend."
      );
    } finally {
      setCargando(false);
    }
  }

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
            Registro de asistencia
          </p>
        </div>
      </header>

      <SGANav />

      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "40px 32px",
          display: "grid",
          gridTemplateColumns:
            "minmax(350px, 430px) 1fr",
          gap: "28px",
          alignItems: "start",
        }}
      >
        <form
          onSubmit={registrarAsistencia}
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            boxShadow:
              "0 2px 8px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "6px",
              fontSize: "25px",
            }}
          >
            Registrar asistencia
          </h2>

          <p
            style={{
              marginTop: 0,
              marginBottom: "28px",
              color: "#64748b",
            }}
          >
            Selecciona la persona, horario y estado
            correspondiente.
          </p>

          <label style={labelStyle}>
            Persona
          </label>

          <select
            value={persona}
            onChange={(event) =>
              setPersona(event.target.value)
            }
            style={inputStyle}
          >
            <option value="">
              Selecciona una persona
            </option>

            {personas.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.codigo} - {item.nombres}{" "}
                {item.apellidos}
              </option>
            ))}
          </select>

          <label style={labelStyle}>
            Horario
          </label>

          <select
            value={horario}
            onChange={(event) =>
              setHorario(event.target.value)
            }
            style={inputStyle}
          >
            <option value="">
              Selecciona un horario
            </option>

            {horarios.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.nombre}
              </option>
            ))}
          </select>

          <label style={labelStyle}>
            Fecha
          </label>

          <input
            type="date"
            value={fecha}
            onChange={(event) =>
              setFecha(event.target.value)
            }
            style={inputStyle}
          />

          <label style={labelStyle}>
            Hora de registro
          </label>

          <input
            type="time"
            value={horaRegistro}
            onChange={(event) =>
              setHoraRegistro(event.target.value)
            }
            style={inputStyle}
          />

          <label style={labelStyle}>
            Estado
          </label>

          <select
            value={estado}
            onChange={(event) =>
              setEstado(event.target.value)
            }
            style={inputStyle}
          >
            <option value="presente">
              Presente
            </option>

            <option value="tardanza">
              Tardanza
            </option>

            <option value="ausencia">
              Ausencia
            </option>

            <option value="justificada">
              Justificada
            </option>
          </select>

          <label style={labelStyle}>
            Observación
          </label>

          <textarea
            value={observacion}
            onChange={(event) =>
              setObservacion(event.target.value)
            }
            placeholder="Observación opcional..."
            maxLength={250}
            style={{
              ...inputStyle,
              minHeight: "90px",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: cargando
                ? "#64748b"
                : "#0f1b35",
              color: "white",
              fontSize: "17px",
              cursor: cargando
                ? "not-allowed"
                : "pointer",
            }}
          >
            {cargando
              ? "Registrando..."
              : "Registrar asistencia"}
          </button>

          {mensaje && (
            <div style={successStyle}>
              {mensaje}
            </div>
          )}

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}
        </form>

        <section
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            boxShadow:
              "0 2px 8px rgba(15, 23, 42, 0.08)",
            minHeight: "540px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "25px",
                }}
              >
                Registros de asistencia
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                }}
              >
                Información obtenida mediante la API
                REST del SGA.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarDatos}
              style={{
                padding: "11px 18px",
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: "9px",
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Actualizar
            </button>
          </div>

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
                    borderBottom:
                      "1px solid #e2e8f0",
                    color: "#475569",
                    textAlign: "left",
                  }}
                >
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Hora</th>
                  <th style={thStyle}>Persona</th>
                  <th style={thStyle}>Horario</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Observación</th>
                </tr>
              </thead>

              <tbody>
                {asistencias.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "35px 14px",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      No hay registros de asistencia.
                    </td>
                  </tr>
                ) : (
                  asistencias.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom:
                          "1px solid #f1f5f9",
                      }}
                    >
                      <td style={tdStyle}>
                        {formatearFecha(item.fecha)}
                      </td>

                      <td style={tdStyle}>
                        {formatearHora(
                          item.hora_registro
                        )}
                      </td>

                      <td style={tdStyle}>
                        <strong>
                          {item.persona_nombre}
                        </strong>

                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "13px",
                            marginTop: "3px",
                          }}
                        >
                          {item.persona_codigo}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        {item.horario_nombre}
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={estadoStyle(
                            item.estado
                          )}
                        >
                          {item.estado_display}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {item.observacion || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function formatearHora(hora: string) {
  return hora.substring(0, 5);
}

function formatearFecha(fecha: string) {
  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoStyle(estado: string) {
  const base = {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 600,
  };

  if (estado === "presente") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#15803d",
    };
  }

  if (estado === "tardanza") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#b45309",
    };
  }

  if (estado === "ausencia") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
  };
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
} as const;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  marginBottom: "20px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  fontSize: "16px",
  background: "white",
  outline: "none",
} as const;

const thStyle = {
  padding: "14px",
  fontWeight: 600,
  whiteSpace: "nowrap",
} as const;

const tdStyle = {
  padding: "16px 14px",
  verticalAlign: "middle",
} as const;

const successStyle = {
  marginTop: "18px",
  padding: "14px",
  background: "#ecfdf5",
  color: "#15803d",
  borderRadius: "10px",
} as const;

const errorStyle = {
  marginTop: "18px",
  padding: "14px",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: "10px",
} as const;