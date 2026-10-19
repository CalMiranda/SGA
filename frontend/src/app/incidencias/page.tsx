"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import SGANav from "@/components/SGANav";

type Asistencia = {
  id: number;
  persona_codigo: string;
  persona_nombre: string;
  horario_nombre: string;
  fecha: string;
  hora_registro: string;
  estado: string;
  estado_display: string;
};

type Incidencia = {
  id: number;
  asistencia: number;
  persona_codigo: string;
  persona_nombre: string;
  fecha_asistencia: string;
  horario_nombre: string;
  estado_asistencia: string;
  tipo: string;
  tipo_display: string;
  descripcion: string;
  estado: string;
  estado_display: string;
  tiene_justificacion: boolean;
};

type Justificacion = {
  id: number;
  incidencia: number;
  persona_codigo: string;
  persona_nombre: string;
  fecha_asistencia: string;
  tipo_incidencia: string;
  descripcion_incidencia: string;
  motivo: string;
  estado: string;
  estado_display: string;
  observacion_revision: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export default function IncidenciasPage() {
  const [asistencias, setAsistencias] =
    useState<Asistencia[]>([]);

  const [incidencias, setIncidencias] =
    useState<Incidencia[]>([]);

  const [justificaciones, setJustificaciones] =
    useState<Justificacion[]>([]);

  const [asistencia, setAsistencia] = useState("");
  const [tipo, setTipo] = useState("tardanza");
  const [descripcion, setDescripcion] = useState("");

  const [incidenciaJustificar, setIncidenciaJustificar] =
    useState("");

  const [motivo, setMotivo] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    setError("");

    try {
      const [
        responseAsistencias,
        responseIncidencias,
        responseJustificaciones,
      ] = await Promise.all([
        fetch(`${API_URL}/api/asistencias/`, {
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/incidencias/`, {
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/justificaciones/`, {
          cache: "no-store",
        }),
      ]);

      if (
        !responseAsistencias.ok ||
        !responseIncidencias.ok ||
        !responseJustificaciones.ok
      ) {
        throw new Error();
      }

      const dataAsistencias: Asistencia[] =
        await responseAsistencias.json();

      const dataIncidencias: Incidencia[] =
        await responseIncidencias.json();

      const dataJustificaciones: Justificacion[] =
        await responseJustificaciones.json();

      setAsistencias(dataAsistencias);
      setIncidencias(dataIncidencias);
      setJustificaciones(dataJustificaciones);
    } catch {
      setError(
        "No fue posible cargar la información del backend."
      );
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function registrarIncidencia(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setError("");

    if (!asistencia || !tipo || !descripcion.trim()) {
      setError(
        "Completa todos los campos de la incidencia."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/incidencias/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            asistencia: Number(asistencia),
            tipo,
            descripcion: descripcion.trim(),
            estado: "pendiente",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        mostrarErrorBackend(data);
        return;
      }

      setAsistencia("");
      setTipo("tardanza");
      setDescripcion("");

      setMensaje(
        "Incidencia registrada correctamente."
      );

      await cargarDatos();
    } catch {
      setError(
        "No fue posible registrar la incidencia."
      );
    }
  }

  async function registrarJustificacion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setError("");

    if (
      !incidenciaJustificar ||
      !motivo.trim()
    ) {
      setError(
        "Selecciona una incidencia e ingresa el motivo."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/justificaciones/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            incidencia: Number(incidenciaJustificar),
            motivo: motivo.trim(),
            estado: "pendiente",
            observacion_revision: "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        mostrarErrorBackend(data);
        return;
      }

      setIncidenciaJustificar("");
      setMotivo("");

      setMensaje(
        "Justificación registrada correctamente."
      );

      await cargarDatos();
    } catch {
      setError(
        "No fue posible registrar la justificación."
      );
    }
  }

  async function revisarJustificacion(
    id: number,
    nuevoEstado: "aprobada" | "rechazada"
  ) {
    setMensaje("");
    setError("");

    const observacion =
      nuevoEstado === "aprobada"
        ? "Justificación aprobada."
        : "Justificación rechazada.";

    try {
      const response = await fetch(
        `${API_URL}/api/justificaciones/${id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            estado: nuevoEstado,
            observacion_revision: observacion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        mostrarErrorBackend(data);
        return;
      }

      setMensaje(
        nuevoEstado === "aprobada"
          ? "Justificación aprobada correctamente."
          : "Justificación rechazada correctamente."
      );

      await cargarDatos();
    } catch {
      setError(
        "No fue posible revisar la justificación."
      );
    }
  }

  function mostrarErrorBackend(data: unknown) {
    if (
      typeof data === "object" &&
      data !== null
    ) {
      const valores = Object.values(
        data as Record<string, unknown>
      );

      if (valores.length > 0) {
        const primerError = valores[0];

        if (Array.isArray(primerError)) {
          setError(String(primerError[0]));
          return;
        }

        if (typeof primerError === "string") {
          setError(primerError);
          return;
        }
      }
    }

    setError(
      "La operación no pudo completarse."
    );
  }

  const asistenciasConIncidencia =
    new Set(
      incidencias.map(
        (incidencia) => incidencia.asistencia
      )
    );

  const asistenciasDisponibles =
    asistencias.filter(
      (item) =>
        !asistenciasConIncidencia.has(item.id) &&
        (
          item.estado === "tardanza" ||
          item.estado === "ausencia"
        )
    );

  const incidenciasSinJustificacion =
    incidencias.filter(
      (item) => !item.tiene_justificacion
    );

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
            }}
          >
            Incidencias y justificaciones
          </p>
        </div>
      </header>

      <SGANav />

      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "36px 32px",
        }}
      >
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            marginBottom: "28px",
          }}
        >
          <form
            onSubmit={registrarIncidencia}
            style={cardStyle}
          >
            <h2 style={titleStyle}>
              Registrar incidencia
            </h2>

            <p style={descriptionStyle}>
              Registra una incidencia asociada a una
              tardanza o ausencia.
            </p>

            <label style={labelStyle}>
              Registro de asistencia
            </label>

            <select
              value={asistencia}
              onChange={(event) =>
                setAsistencia(event.target.value)
              }
              style={inputStyle}
            >
              <option value="">
                Selecciona una asistencia
              </option>

              {asistenciasDisponibles.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.persona_codigo} -{" "}
                    {item.persona_nombre} -{" "}
                    {formatearFecha(item.fecha)} -{" "}
                    {item.estado_display}
                  </option>
                )
              )}
            </select>

            <label style={labelStyle}>
              Tipo de incidencia
            </label>

            <select
              value={tipo}
              onChange={(event) =>
                setTipo(event.target.value)
              }
              style={inputStyle}
            >
              <option value="tardanza">
                Tardanza
              </option>

              <option value="ausencia">
                Ausencia
              </option>

              <option value="otra">
                Otra
              </option>
            </select>

            <label style={labelStyle}>
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(event) =>
                setDescripcion(event.target.value)
              }
              maxLength={300}
              placeholder="Describe la incidencia..."
              style={textAreaStyle}
            />

            <button
              type="submit"
              style={primaryButton}
            >
              Registrar incidencia
            </button>
          </form>

          <form
            onSubmit={registrarJustificacion}
            style={cardStyle}
          >
            <h2 style={titleStyle}>
              Registrar justificación
            </h2>

            <p style={descriptionStyle}>
              Registra el motivo presentado para una
              incidencia pendiente.
            </p>

            <label style={labelStyle}>
              Incidencia
            </label>

            <select
              value={incidenciaJustificar}
              onChange={(event) =>
                setIncidenciaJustificar(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Selecciona una incidencia
              </option>

              {incidenciasSinJustificacion.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.persona_codigo} -{" "}
                    {item.persona_nombre} -{" "}
                    {item.tipo_display}
                  </option>
                )
              )}
            </select>

            <label style={labelStyle}>
              Motivo
            </label>

            <textarea
              value={motivo}
              onChange={(event) =>
                setMotivo(event.target.value)
              }
              maxLength={500}
              placeholder="Escribe el motivo de la justificación..."
              style={textAreaStyle}
            />

            <button
              type="submit"
              style={primaryButton}
            >
              Registrar justificación
            </button>
          </form>
        </div>

        <section
          style={{
            ...cardStyle,
            marginBottom: "28px",
          }}
        >
          <h2 style={titleStyle}>
            Incidencias registradas
          </h2>

          <p style={descriptionStyle}>
            Incidencias asociadas a los registros de
            asistencia.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderStyle}>
                  <th style={thStyle}>
                    Persona
                  </th>

                  <th style={thStyle}>
                    Fecha
                  </th>

                  <th style={thStyle}>
                    Tipo
                  </th>

                  <th style={thStyle}>
                    Descripción
                  </th>

                  <th style={thStyle}>
                    Estado
                  </th>

                  <th style={thStyle}>
                    Justificación
                  </th>
                </tr>
              </thead>

              <tbody>
                {incidencias.map((item) => (
                  <tr
                    key={item.id}
                    style={rowStyle}
                  >
                    <td style={tdStyle}>
                      <strong>
                        {item.persona_nombre}
                      </strong>

                      <div style={secondaryText}>
                        {item.persona_codigo}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      {formatearFecha(
                        item.fecha_asistencia
                      )}
                    </td>

                    <td style={tdStyle}>
                      {item.tipo_display}
                    </td>

                    <td style={tdStyle}>
                      {item.descripcion}
                    </td>

                    <td style={tdStyle}>
                      {item.estado_display}
                    </td>

                    <td style={tdStyle}>
                      {item.tiene_justificacion
                        ? "Registrada"
                        : "Pendiente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>
            Justificaciones
          </h2>

          <p style={descriptionStyle}>
            Revisión de las solicitudes registradas.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderStyle}>
                  <th style={thStyle}>
                    Persona
                  </th>

                  <th style={thStyle}>
                    Fecha
                  </th>

                  <th style={thStyle}>
                    Incidencia
                  </th>

                  <th style={thStyle}>
                    Motivo
                  </th>

                  <th style={thStyle}>
                    Estado
                  </th>

                  <th style={thStyle}>
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {justificaciones.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "30px",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      No hay justificaciones
                      registradas.
                    </td>
                  </tr>
                ) : (
                  justificaciones.map(
                    (item) => (
                      <tr
                        key={item.id}
                        style={rowStyle}
                      >
                        <td style={tdStyle}>
                          <strong>
                            {item.persona_nombre}
                          </strong>

                          <div
                            style={secondaryText}
                          >
                            {item.persona_codigo}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {formatearFecha(
                            item.fecha_asistencia
                          )}
                        </td>

                        <td style={tdStyle}>
                          {item.tipo_incidencia}
                        </td>

                        <td style={tdStyle}>
                          {item.motivo}
                        </td>

                        <td style={tdStyle}>
                          {item.estado_display}
                        </td>

                        <td style={tdStyle}>
                          {item.estado ===
                          "pendiente" ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  revisarJustificacion(
                                    item.id,
                                    "aprobada"
                                  )
                                }
                                style={approveButton}
                              >
                                Aprobar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  revisarJustificacion(
                                    item.id,
                                    "rechazada"
                                  )
                                }
                                style={rejectButton}
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            "Revisada"
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function formatearFecha(fecha: string) {
  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

const cardStyle = {
  background: "white",
  borderRadius: "16px",
  padding: "28px",
  boxShadow:
    "0 2px 8px rgba(15, 23, 42, 0.08)",
} as const;

const titleStyle = {
  marginTop: 0,
  marginBottom: "6px",
  fontSize: "23px",
} as const;

const descriptionStyle = {
  marginTop: 0,
  marginBottom: "24px",
  color: "#64748b",
} as const;

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
} as const;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px",
  marginBottom: "20px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  background: "white",
  fontSize: "15px",
} as const;

const textAreaStyle = {
  ...inputStyle,
  minHeight: "100px",
  resize: "vertical",
  fontFamily: "inherit",
} as const;

const primaryButton = {
  width: "100%",
  padding: "14px",
  border: "none",
  borderRadius: "9px",
  background: "#0f1b35",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
} as const;

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
} as const;

const tableHeaderStyle = {
  textAlign: "left",
  color: "#475569",
  borderBottom: "1px solid #e2e8f0",
} as const;

const rowStyle = {
  borderBottom: "1px solid #f1f5f9",
} as const;

const thStyle = {
  padding: "14px",
  whiteSpace: "nowrap",
} as const;

const tdStyle = {
  padding: "15px 14px",
  verticalAlign: "middle",
} as const;

const secondaryText = {
  color: "#64748b",
  fontSize: "13px",
  marginTop: "3px",
} as const;

const successStyle = {
  padding: "14px",
  marginBottom: "22px",
  background: "#ecfdf5",
  color: "#15803d",
  borderRadius: "10px",
} as const;

const errorStyle = {
  padding: "14px",
  marginBottom: "22px",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: "10px",
} as const;

const approveButton = {
  padding: "8px 12px",
  border: "none",
  borderRadius: "7px",
  background: "#dcfce7",
  color: "#15803d",
  cursor: "pointer",
  fontWeight: 600,
} as const;

const rejectButton = {
  padding: "8px 12px",
  border: "none",
  borderRadius: "7px",
  background: "#fee2e2",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 600,
} as const;