"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { useSGAAccess } from "@/lib/access";
import { apiFetch } from "@/lib/api";

type Attendance = { id: number; persona_codigo: string; persona_nombre: string; horario_nombre: string; fecha: string; estado_display: string };
type Incident = { id: number; asistencia: number; persona_codigo: string; persona_nombre: string; fecha_asistencia: string; horario_nombre: string; tipo: string; tipo_display: string; descripcion: string; estado: string; estado_display: string; tiene_justificacion: boolean };
type Justification = { id: number; incidencia: number; persona_codigo: string; persona_nombre: string; fecha_asistencia: string; tipo_incidencia: string; descripcion_incidencia: string; motivo: string; estado: string; estado_display: string; observacion_revision: string };

export default function IncidenciasPage() {
  const { canWrite } = useSGAAccess();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [attendanceId, setAttendanceId] = useState("");
  const [type, setType] = useState("tardanza");
  const [description, setDescription] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [attendanceResponse, incidentResponse, justificationResponse] = await Promise.all([
        apiFetch("/api/asistencias/", { cache: "no-store" }),
        apiFetch("/api/incidencias/", { cache: "no-store" }),
        apiFetch("/api/justificaciones/", { cache: "no-store" }),
      ]);
      if (!attendanceResponse.ok || !incidentResponse.ok || !justificationResponse.ok) throw new Error("No fue posible consultar las incidencias.");
      const [attendanceData, incidentData, justificationData]: [Attendance[], Incident[], Justification[]] = await Promise.all([
        attendanceResponse.json(), incidentResponse.json(), justificationResponse.json(),
      ]);
      setAttendance(attendanceData);
      setIncidents(incidentData);
      setJustifications(justificationData);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible consultar las incidencias.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { void Promise.resolve().then(loadData); }, [loadData]);

  function refreshData() {
    setLoading(true);
    void loadData();
  }

  const availableIncidents = useMemo(() => incidents.filter((item) => !item.tiene_justificacion), [incidents]);
  const pendingIncidents = incidents.filter((item) => item.estado === "pendiente").length;
  const pendingJustifications = justifications.filter((item) => item.estado === "pendiente").length;
  const resolved = incidents.filter((item) => item.estado === "resuelta").length;

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch("/api/incidencias/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asistencia: Number(attendanceId), tipo: type, descripcion: description.trim(), estado: "pendiente" }),
      });
      if (!response.ok) throw new Error(await backendError(response));
      setAttendanceId("");
      setDescription("");
      setMessage("Incidencia registrada correctamente.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible registrar la incidencia.");
    } finally {
      setSaving(false);
    }
  }

  async function createJustification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch("/api/justificaciones/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidencia: Number(incidentId), motivo: reason.trim(), estado: "pendiente", observacion_revision: "" }),
      });
      if (!response.ok) throw new Error(await backendError(response));
      setIncidentId("");
      setReason("");
      setMessage("Solicitud de justificación registrada.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible registrar la justificación.");
    } finally {
      setSaving(false);
    }
  }

  async function reviewJustification(item: Justification, newState: "aprobada" | "rechazada") {
    const decision = newState === "aprobada" ? "aprobar" : "rechazar";
    if (!window.confirm(`¿Deseas ${decision} la justificación de ${item.persona_nombre}?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch(`/api/justificaciones/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newState, observacion_revision: newState === "aprobada" ? "Justificación aprobada." : "Justificación rechazada." }),
      });
      if (!response.ok) throw new Error(await backendError(response));
      setMessage(newState === "aprobada" ? "Justificación aprobada." : "Justificación rechazada.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible revisar la justificación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Incidencias y justificaciones" subtitle="Registra eventos asociados a una asistencia y revisa las solicitudes recibidas">
      <div className="metric-grid three-metrics">
        <Metric icon="alert" tone="amber" label="Incidencias pendientes" value={pendingIncidents} detail="Requieren seguimiento" />
        <Metric icon="file" tone="blue" label="Justificaciones pendientes" value={pendingJustifications} detail="Esperan revisión" />
        <Metric icon="check" tone="green" label="Incidencias resueltas" value={resolved} detail="Con seguimiento completado" />
      </div>
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="incidence-grid">
        <section className="panel panel-pad">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon tone-amber"><Icon name="alert" size={17} /></span><div><h2>Registrar incidencia</h2><p>Vincula el evento a un registro de asistencia</p></div></div></div>
          {!canWrite ? <p className="access-note">Tu rol permite consultar incidencias; el registro está reservado a Administración y Gestión de asistencia.</p> : attendance.length === 0 && !loading ? <div className="empty-state">Primero debe existir un registro de asistencia.</div> : <form className="form-fields" onSubmit={createIncident}>
            <label className="field-label">Asistencia relacionada *<select className="control-select" required value={attendanceId} onChange={(event) => setAttendanceId(event.target.value)}><option value="">Selecciona una asistencia</option>{attendance.map((item) => <option key={item.id} value={item.id}>{item.fecha} · {item.persona_codigo} · {item.persona_nombre} · {item.estado_display}</option>)}</select></label>
            <label className="field-label">Tipo de incidencia *<select className="control-select" value={type} onChange={(event) => setType(event.target.value)}><option value="tardanza">Tardanza</option><option value="ausencia">Ausencia</option><option value="otra">Otra</option></select></label>
            <label className="field-label">Descripción *<textarea className="control-textarea" required maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe el evento (máximo 300 caracteres)" /></label>
            <button className="button button-primary" type="submit" disabled={saving || loading}><Icon name="plus" size={16} />Registrar incidencia</button>
          </form>}
        </section>

        <section className="panel panel-pad">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon tone-blue"><Icon name="file" size={17} /></span><div><h2>Registrar justificación</h2><p>Envía una solicitud para su revisión</p></div></div></div>
          {!canWrite ? <p className="access-note">Tu rol permite consultar las solicitudes; el envío de justificaciones está reservado a Administración y Gestión de asistencia.</p> : availableIncidents.length === 0 && !loading ? <div className="empty-state">No hay incidencias disponibles para justificar.</div> : <form className="form-fields" onSubmit={createJustification}>
            <label className="field-label">Incidencia *<select className="control-select" required value={incidentId} onChange={(event) => setIncidentId(event.target.value)}><option value="">Selecciona una incidencia</option>{availableIncidents.map((item) => <option key={item.id} value={item.id}>{item.fecha_asistencia} · {item.persona_codigo} · {item.persona_nombre} · {item.tipo_display}</option>)}</select></label>
            <label className="field-label">Motivo *<textarea className="control-textarea" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explica el motivo de la solicitud" /></label>
            <button className="button button-primary" type="submit" disabled={saving || loading}><Icon name="file" size={16} />Enviar solicitud</button>
          </form>}
        </section>
      </div>

      <section className="panel panel-pad table-section">
        <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="alert" size={17} /></span><div><h2>Incidencias registradas</h2><p>Detalle de eventos y su estado actual</p></div></div><button className="button button-secondary" type="button" onClick={refreshData} disabled={loading}><Icon name="refresh" size={15} />Actualizar</button></div>
        {loading ? <div className="loading-state">Consultando incidencias...</div> : incidents.length === 0 ? <div className="empty-state">No hay incidencias registradas.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha</th><th>Persona</th><th>Horario</th><th>Tipo</th><th>Descripción</th><th>Estado</th><th>Justificación</th></tr></thead><tbody>{incidents.map((item) => <tr key={item.id}><td>{item.fecha_asistencia}</td><td><strong>{item.persona_nombre}</strong><small className="cell-secondary">{item.persona_codigo}</small></td><td>{item.horario_nombre}</td><td>{item.tipo_display}</td><td>{item.descripcion}</td><td><StatePill value={item.estado} label={item.estado_display} /></td><td>{item.tiene_justificacion ? "Enviada" : "—"}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel panel-pad table-section">
        <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="file" size={17} /></span><div><h2>Justificaciones</h2><p>Solicitudes registradas y decisiones de revisión</p></div></div></div>
        {loading ? <div className="loading-state">Consultando solicitudes...</div> : justifications.length === 0 ? <div className="empty-state">No hay justificaciones registradas.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha</th><th>Persona</th><th>Incidencia</th><th>Motivo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{justifications.map((item) => <tr key={item.id}><td>{item.fecha_asistencia}</td><td><strong>{item.persona_nombre}</strong><small className="cell-secondary">{item.persona_codigo}</small></td><td>{item.tipo_incidencia}</td><td>{item.motivo}</td><td><StatePill value={item.estado} label={item.estado_display} /></td><td>{item.estado === "pendiente" && canWrite ? <div className="table-toolbar"><button className="button button-quiet approve-quiet" type="button" disabled={saving} onClick={() => void reviewJustification(item, "aprobada")}>Aprobar</button><button className="button button-quiet danger-quiet" type="button" disabled={saving} onClick={() => void reviewJustification(item, "rechazada")}>Rechazar</button></div> : item.observacion_revision || (item.estado === "pendiente" ? "Pendiente de revisión" : "Revisada")}</td></tr>)}</tbody></table></div>}
      </section>
    </AppShell>
  );
}

function Metric({ icon, tone, label, value, detail }: { icon: string; tone: string; label: string; value: number; detail: string }) {
  return <section className="panel metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon} /></span><span className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></span></section>;
}

function StatePill({ value, label }: { value: string; label: string }) {
  const status = value === "aprobada" || value === "resuelta" ? "status-approved" : value === "rechazada" ? "status-rejected" : "status-pending";
  return <span className={`status-pill ${status}`}>{label}</span>;
}

async function backendError(response: Response) {
  const detail = await response.json().catch(() => ({}));
  const values = Object.values(detail as Record<string, unknown>);
  const first = values[0];
  if (Array.isArray(first)) return String(first[0]);
  if (typeof first === "string") return first;
  return "No fue posible guardar los datos. Verifica los campos e inténtalo de nuevo.";
}
