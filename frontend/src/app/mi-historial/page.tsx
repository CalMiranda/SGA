"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { toCsv } from "@/lib/csv";

type Incident = {
  tipo: string;
  descripcion: string;
  estado: string;
  justificacion: null | {
    motivo: string;
    estado: string;
    observacion_revision: string;
  };
};

type Attendance = {
  id: number;
  fecha: string;
  hora_registro: string;
  horario_nombre: string;
  estado: string;
  estado_display: string;
  observacion: string;
  incidencias: Incident[];
};

type HistoryPayload = {
  persona: { codigo: string; nombre: string; rol: string; area: string };
  resumen: {
    total: number;
    presente: number;
    tardanza: number;
    ausencia: number;
    justificada: number;
    limitado: boolean;
  };
  registros: Attendance[];
};

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "presente", label: "Presente" },
  { value: "tardanza", label: "Tardanza" },
  { value: "ausencia", label: "Ausencia" },
  { value: "justificada", label: "Justificada" },
];

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function statusClass(status: string) {
  return ({
    presente: "status-active",
    tardanza: "status-pending",
    ausencia: "status-inactive",
    justificada: "status-info",
  } as Record<string, string>)[status] ?? "status-info";
}

export default function MyAttendanceHistoryPage() {
  const today = todayKey();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(today);
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState({ desde: "", hasta: today, estado: "" });
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (filters.desde) query.set("desde", filters.desde);
    if (filters.hasta) query.set("hasta", filters.hasta);
    if (filters.estado) query.set("estado", filters.estado);
    try {
      const response = await apiFetch(`/api/mi-historial/${query.size ? `?${query}` : ""}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || "No se pudo consultar tu historial.");
      setData(payload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar tu historial.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void Promise.resolve().then(loadHistory); }, [loadHistory]);

  const records = useMemo(() => data?.registros ?? [], [data]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setError("");
    setFilters({ desde: dateFrom, hasta: dateTo, estado: status });
  }

  function exportCsv() {
    const rows = [
      ["Fecha", "Hora", "Horario", "Estado", "Observación", "Incidencias", "Justificaciones"],
      ...records.map((item) => [
        item.fecha,
        item.hora_registro,
        item.horario_nombre,
        item.estado_display,
        item.observacion,
        item.incidencias.map((incident) => `${incident.tipo}: ${incident.descripcion}`).join(" | "),
        item.incidencias.map((incident) => incident.justificacion?.motivo ?? "").filter(Boolean).join(" | "),
      ]),
    ];
    const csv = toCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mi-historial-asistencia-${filters.desde || "inicio"}-${filters.hasta || "hoy"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Mi historial de asistencia" subtitle="Consulta únicamente tus registros personales">
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {data && <section className="panel personal-profile-card">
        <span className="metric-icon tone-blue"><Icon name="people" /></span>
        <div className="personal-profile-copy">
          <span className="small muted">Ficha personal</span>
          <h2>{data.persona.nombre}</h2>
          <p>{data.persona.codigo} · {data.persona.rol} · {data.persona.area}</p>
        </div>
        <span className="personal-total"><strong>{data.resumen.total}</strong><small>registros encontrados</small></span>
      </section>}

      <div className="metric-grid personal-metrics">
        <Metric label="Presentes" value={data?.resumen.presente ?? 0} tone="green" icon="check" />
        <Metric label="Tardanzas" value={data?.resumen.tardanza ?? 0} tone="amber" icon="clock" />
        <Metric label="Ausencias" value={data?.resumen.ausencia ?? 0} tone="red" icon="alert" />
        <Metric label="Justificadas" value={data?.resumen.justificada ?? 0} tone="blue" icon="file" />
      </div>

      <form className="panel report-filter personal-filter no-print" onSubmit={applyFilters}>
        <label className="field-label date-range-field">Rango de fechas
          <span className="date-range-controls">
            <input className="control" aria-label="Desde" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <span>–</span>
            <input className="control" aria-label="Hasta" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </span>
        </label>
        <label className="field-label">Estado
          <select className="control-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button className="button button-primary" type="submit"><Icon name="filter" size={15} />Aplicar filtros</button>
        <button className="button button-secondary" type="button" onClick={exportCsv} disabled={!records.length}><Icon name="download" size={15} />Exportar CSV</button>
      </form>

      <section className="panel panel-pad">
        <div className="panel-heading">
          <div className="panel-title"><span className="panel-title-icon"><Icon name="clock" size={17} /></span><div><h2>Registros personales</h2><p>Asistencia, incidencias y justificaciones vinculadas a tu ficha</p></div></div>
          <button className="button button-secondary no-print" type="button" onClick={() => void loadHistory()} disabled={loading}><Icon name="refresh" size={15} />Actualizar</button>
        </div>
        {loading ? <div className="loading-state">Consultando tu historial...</div> : records.length === 0 ? <div className="empty-state">No se encontraron registros para los filtros seleccionados.</div> : <div className="table-wrap"><table className="data-table personal-history-table">
          <thead><tr><th>Fecha y hora</th><th>Horario</th><th>Estado</th><th>Observación</th><th>Incidencias y justificaciones</th></tr></thead>
          <tbody>{records.map((item) => <tr key={item.id}>
            <td><strong>{item.fecha}</strong><br /><span className="muted small">{item.hora_registro.slice(0, 5)}</span></td>
            <td>{item.horario_nombre}</td>
            <td><span className={`status-pill ${statusClass(item.estado)}`}>{item.estado_display}</span></td>
            <td>{item.observacion || <span className="muted">—</span>}</td>
            <td>{item.incidencias.length ? <ul className="personal-incident-list">{item.incidencias.map((incident, index) => <li key={`${item.id}-${index}`}><strong>{incident.tipo}</strong>: {incident.descripcion}<small>{incident.estado}{incident.justificacion ? ` · Justificación: ${incident.justificacion.estado}` : ""}</small></li>)}</ul> : <span className="muted">Sin incidencias</span>}</td>
          </tr>)}</tbody>
        </table></div>}
        {data?.resumen.limitado && <p className="table-footnote">Se muestran los primeros 500 registros. Usa el rango de fechas para consultar un período menor.</p>}
      </section>
    </AppShell>
  );
}

function Metric({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: string }) {
  return <section className="panel metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon} /></span><span className="metric-copy"><span>{label}</span><strong>{value.toLocaleString("es-NI")}</strong><small>En el período seleccionado</small></span></section>;
}
