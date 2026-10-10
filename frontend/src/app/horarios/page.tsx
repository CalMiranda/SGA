"use client";
import SGANav from "@/components/SGANav";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Horario = {
  id: number;
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  tolerancia_minutos: number;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function HorariosPage() {
  const [horarios, setHorarios] = useState<Horario[]>([]);

  const [nombre, setNombre] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [tolerancia, setTolerancia] = useState("10");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarHorarios = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/horarios/`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No fue posible consultar los horarios.");
      }

      const data: Horario[] = await response.json();
      setHorarios(data);
    } catch {
      setError(
        "No se pudo conectar con el backend. Verifica que Django esté ejecutándose."
      );
    }
  }, []);

  useEffect(() => {
    cargarHorarios();
  }, [cargarHorarios]);

  async function registrarHorario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMensaje("");
    setError("");

    if (!nombre.trim() || !horaEntrada || !horaSalida) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    const toleranciaNumero = Number(tolerancia);

    if (
      Number.isNaN(toleranciaNumero) ||
      toleranciaNumero < 0
    ) {
      setError("La tolerancia debe ser un número válido.");
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(`${API_URL}/api/horarios/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          hora_entrada: horaEntrada,
          hora_salida: horaSalida,
          tolerancia_minutos: toleranciaNumero,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.nombre) {
          setError(`Nombre: ${data.nombre[0]}`);
        } else if (data.hora_salida) {
          setError(data.hora_salida[0]);
        } else if (data.non_field_errors) {
          setError(data.non_field_errors[0]);
        } else {
          setError("No fue posible registrar el horario.");
        }

        return;
      }

      setNombre("");
      setHoraEntrada("");
      setHoraSalida("");
      setTolerancia("10");

      setMensaje("Horario registrado correctamente.");

      await cargarHorarios();
    } catch {
      setError(
        "No se pudo conectar con el backend. Verifica que Django esté ejecutándose."
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
            Gestión de horarios
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
          gridTemplateColumns: "minmax(320px, 420px) 1fr",
          gap: "28px",
          alignItems: "start",
        }}
      >
        <form
          onSubmit={registrarHorario}
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "6px",
              fontSize: "25px",
            }}
          >
            Registrar horario
          </h2>

          <p
            style={{
              marginTop: 0,
              marginBottom: "28px",
              color: "#64748b",
            }}
          >
            Configura una jornada para el control de asistencia.
          </p>

          <label style={labelStyle}>
            Nombre del horario
          </label>

          <input
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej. Horario Administrativo"
            style={inputStyle}
          />

          <label style={labelStyle}>
            Hora de entrada
          </label>

          <input
            type="time"
            value={horaEntrada}
            onChange={(event) => setHoraEntrada(event.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>
            Hora de salida
          </label>

          <input
            type="time"
            value={horaSalida}
            onChange={(event) => setHoraSalida(event.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>
            Tolerancia en minutos
          </label>

          <input
            type="number"
            min="0"
            value={tolerancia}
            onChange={(event) => setTolerancia(event.target.value)}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%",
              marginTop: "8px",
              padding: "14px",
              background: cargando ? "#64748b" : "#0f1b35",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "17px",
              cursor: cargando ? "not-allowed" : "pointer",
            }}
          >
            {cargando
              ? "Registrando..."
              : "Registrar horario"}
          </button>

          {mensaje && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                background: "#ecfdf5",
                color: "#15803d",
                borderRadius: "10px",
              }}
            >
              {mensaje}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: "10px",
              }}
            >
              {error}
            </div>
          )}
        </form>

        <section
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
            minHeight: "500px",
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
                Horarios registrados
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                }}
              >
                Información obtenida mediante la API REST del SGA.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarHorarios}
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
                    borderBottom: "1px solid #e2e8f0",
                    color: "#475569",
                    textAlign: "left",
                  }}
                >
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Entrada</th>
                  <th style={thStyle}>Salida</th>
                  <th style={thStyle}>Tolerancia</th>
                </tr>
              </thead>

              <tbody>
                {horarios.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "35px 14px",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      No hay horarios registrados.
                    </td>
                  </tr>
                ) : (
                  horarios.map((horario) => (
                    <tr
                      key={horario.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <td style={tdStyle}>
                        <strong>{horario.nombre}</strong>
                      </td>

                      <td style={tdStyle}>
                        {formatearHora(horario.hora_entrada)}
                      </td>

                      <td style={tdStyle}>
                        {formatearHora(horario.hora_salida)}
                      </td>

                      <td style={tdStyle}>
                        {horario.tolerancia_minutos} min
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

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
} as const;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  marginBottom: "22px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  fontSize: "16px",
  outline: "none",
} as const;

const thStyle = {
  padding: "14px",
  fontWeight: 600,
} as const;

const tdStyle = {
  padding: "18px 14px",
} as const;