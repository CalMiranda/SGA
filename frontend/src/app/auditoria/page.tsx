"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { toCsv } from "@/lib/csv";

type AuditEvent = {
  id: number;
  created_at: string;
  actor_username: string | null;
  action: string;
  action_display: string;
  entity: string;
  object_id: string;
  changed_fields: string[];
};

type AuditPayload = { count: number; limit: number; results: AuditEvent[] };

const actionOptions = [
  ["", "Todas las acciones"],
  ["CREATE", "Creación"],
  ["UPDATE", "Modificación"],
  ["DELETE", "Eliminación"],
  ["ACCOUNT_CREATED", "Cuenta creada"],
  ["ACCOUNT_UPDATED", "Cuenta actualizada"],
  ["LOGIN", "Inicio de sesión"],
  ["LOGOUT", "Cierre de sesión"],
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filters, setFilters] = useState({ action: "", entity: "", actor: "", desde: "", hasta: "" });
  const [data, setData] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ limite: "500" });
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    try {
      const response = await apiFetch(`/api/auditoria/?${query}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || "No se pudo consultar la bitácora de auditoría.");
      setData(payload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar la bitácora de auditoría.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void Promise.resolve().then(loadEvents); }, [loadEvents]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setError("");
    setFilters({ action, entity: entity.trim(), actor: actor.trim(), desde: dateFrom, hasta: dateTo });
  }

  function exportCsv() {
    const events = data?.results ?? [];
    const rows = [
      ["Fecha y hora", "Usuario", "Acción", "Entidad", "ID del registro", "Campos modificados"],
      ...events.map((item) => [formatDate(item.created_at), item.actor_username || "Sistema", item.action_display, item.entity, item.object_id, item.changed_fields.join(", ")]),
    ];
    const csv = toCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bitacora-auditoria-sga.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Auditoría" subtitle="Consulta la bitácora cronológica de acciones realizadas en el SGA">
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="metric-grid audit-summary-grid">
        <Metric icon="audit" tone="blue" label="Eventos encontrados" value={data?.count ?? 0} detail="Con los filtros aplicados" />
        <Metric icon="clock" tone="green" label="Eventos cargados" value={data?.results.length ?? 0} detail="Máximo 500 por consulta" />
      </div>
      <form className="panel report-filter audit-filter no-print" onSubmit={applyFilters}>
        <label className="field-label">Acción<select className="control-select" value={action} onChange={(event) => setAction(event.target.value)}>{actionOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field-label">Usuario<input className="control" value={actor} onChange={(event) => setActor(event.target.value)} maxLength={150} placeholder="Nombre de cuenta" /></label>
        <label className="field-label">Entidad<input className="control" value={entity} onChange={(event) => setEntity(event.target.value)} maxLength={120} placeholder="Ej. asistencias" /></label>
        <label className="field-label">Desde<input className="control" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label className="field-label">Hasta<input className="control" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <button className="button button-primary" type="submit"><Icon name="filter" size={15} />Filtrar</button>
        <button className="button button-secondary" type="button" onClick={exportCsv} disabled={!data?.results.length}><Icon name="download" size={15} />Exportar CSV</button>
      </form>
      <section className="panel panel-pad">
        <div className="panel-heading">
          <div className="panel-title"><span className="panel-title-icon"><Icon name="audit" size={17} /></span><div><h2>Bitácora del sistema</h2><p>Se almacenan los campos afectados, sin valores de contraseñas ni datos anteriores</p></div></div>
          <button className="button button-secondary no-print" type="button" onClick={() => void loadEvents()} disabled={loading}><Icon name="refresh" size={15} />Actualizar</button>
        </div>
        {loading ? <div className="loading-state">Consultando eventos...</div> : !data?.results.length ? <div className="empty-state">No se encontraron eventos para los filtros seleccionados.</div> : <div className="table-wrap"><table className="data-table audit-table">
          <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Registro</th><th>Campos afectados</th></tr></thead>
          <tbody>{data.results.map((item) => <tr key={item.id}>
            <td>{formatDate(item.created_at)}</td>
            <td><strong>{item.actor_username || "Sistema"}</strong></td>
            <td><span className={`status-pill ${item.action === "DELETE" ? "status-inactive" : item.action === "LOGIN" || item.action === "LOGOUT" ? "status-info" : "status-active"}`}>{item.action_display}</span></td>
            <td><code className="audit-entity">{item.entity}</code></td>
            <td>{item.object_id || "—"}</td>
            <td>{item.changed_fields.length ? item.changed_fields.join(", ") : "—"}</td>
          </tr>)}</tbody>
        </table></div>}
        {data && data.count > data.results.length && <p className="table-footnote">Se muestran {data.results.length} de {data.count} eventos. Reduce el período para consultar más cerca del detalle.</p>}
      </section>
    </AppShell>
  );
}

function Metric({ icon, tone, label, value, detail }: { icon: string; tone: string; label: string; value: number; detail: string }) {
  return <section className="panel metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon} /></span><span className="metric-copy"><span>{label}</span><strong>{value.toLocaleString("es-NI")}</strong><small>{detail}</small></span></section>;
}
