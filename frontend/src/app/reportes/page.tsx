"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { toCsv } from "@/lib/csv";

type RecordItem = { id: number; horario_nombre: string; fecha: string; estado: string; estado_display: string; persona_codigo: string; persona_nombre: string; persona_rol: string; persona_area: string };
const roleOptions = [
  { value: "estudiante", label: "Estudiante" },
  { value: "docente", label: "Docente" },
  { value: "administrativo", label: "Administrativo" },
  { value: "otro", label: "Otro" },
];
const statusList = [
  { key: "presente", label: "Presentes", color: "#173c68" },
  { key: "tardanza", label: "Tardanzas", color: "#f2aa24" },
  { key: "ausencia", label: "Ausencias", color: "#e94d59" },
  { key: "justificada", label: "Justificadas", color: "#357de0" },
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(value: string) { return value.slice(0, 7); }

export default function ReportesPage() {
  const today = dateKey(new Date());
  const monthStart = `${today.slice(0, 8)}01`;
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [areaFilter, setAreaFilter] = useState("todas");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [reportType, setReportType] = useState("todos");
  const [applied, setApplied] = useState({ from: monthStart, to: today, area: "todas", role: "todos", status: "todos" });

  const loadRecords = useCallback(async () => {
    try {
      const response = await apiFetch("/api/asistencias/", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron consultar los registros para el reporte.");
      setRecords(await response.json());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron consultar los registros para el reporte.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { void Promise.resolve().then(loadRecords); }, [loadRecords]);

  const areas = useMemo(() => [...new Set(records.map((item) => item.persona_area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [records]);
  const baseFiltered = useMemo(() => records.filter((item) =>
    item.fecha >= applied.from && item.fecha <= applied.to &&
    (applied.area === "todas" || item.persona_area === applied.area) &&
    (applied.role === "todos" || roleKey(item.persona_rol) === applied.role) &&
    (applied.status === "todos" || item.estado === applied.status)
  ), [records, applied]);
  const filtered = useMemo(() => baseFiltered.filter((item) => reportType === "todos" || item.estado === reportType), [baseFiltered, reportType]);
  const counts = useMemo(() => baseFiltered.reduce<Record<string, number>>((result, item) => {
    result[item.estado] = (result[item.estado] ?? 0) + 1;
    return result;
  }, { presente: 0, tardanza: 0, ausencia: 0, justificada: 0 }), [baseFiltered]);
  const total = baseFiltered.length;
  const presentRate = total ? Math.round((counts.presente / total) * 100) : 0;
  const latenessRate = total ? Math.round((counts.tardanza / total) * 100) : 0;
  const absenceRate = total ? Math.round((counts.ausencia / total) * 100) : 0;
  const byArea = useMemo(() => {
    return aggregateByArea(baseFiltered);
  }, [baseFiltered]);
  const resultByArea = useMemo(() => aggregateByArea(filtered), [filtered]);

  const lastMonths = useMemo(() => {
    const anchor = new Date(`${applied.to || today}T12:00:00`);
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (5 - index), 1);
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat("es-NI", { month: "short" }).format(date).replace(".", "") };
    });
  }, [applied.to, today]);
  const monthly = lastMonths.map((month) => {
      const monthRecords = baseFiltered.filter((item) => monthKey(item.fecha) === month.key);
    return { ...month, counts: monthRecords.reduce<Record<string, number>>((result, item) => { result[item.estado] = (result[item.estado] ?? 0) + 1; return result; }, { presente: 0, tardanza: 0, ausencia: 0, justificada: 0 }) };
  });
  const maxMonthly = Math.max(1, ...monthly.map((item) => Object.values(item.counts).reduce((sum, value) => sum + value, 0)));
  const donut = donutStyle(counts, total);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setError("");
    setApplied({ from: dateFrom, to: dateTo, area: areaFilter, role: roleFilter, status: statusFilter });
  }

  function exportCsv() {
    const rows = [["Fecha", "Código", "Persona", "Rol", "Grupo / Área", "Horario", "Estado"], ...filtered.map((item) => [item.fecha, item.persona_codigo, item.persona_nombre, item.persona_rol, item.persona_area, item.horario_nombre, item.estado_display])];
    const csv = toCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-asistencia-${applied.from}-${applied.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Reportes" subtitle="Consulta indicadores calculados a partir de los registros existentes">
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form className="panel report-filter no-print" onSubmit={applyFilters}>
        <label className="field-label date-range-field">Rango de fechas<div className="date-range-controls"><input className="control" aria-label="Desde" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} required /><span>–</span><input className="control" aria-label="Hasta" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} required /></div></label>
        <label className="field-label">Grupo / Área<select className="control-select" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="todas">Todos los grupos</option>{areas.map((area) => <option value={area} key={area}>{area}</option>)}</select></label>
        <label className="field-label">Rol<select className="control-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="todos">Todos los roles</option>{roleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <label className="field-label">Estado<select className="control-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos los estados</option>{statusList.map((option) => <option value={option.key} key={option.key}>{option.label}</option>)}</select></label>
        <button className="button button-primary" type="submit"><Icon name="filter" size={15} />Aplicar filtros</button>
        <button className="button button-secondary" type="button" onClick={() => window.print()}><Icon name="file" size={15} />Imprimir / guardar PDF</button>
      </form>

      {loading ? <section className="panel loading-state">Preparando el reporte...</section> : <>
        <div className="report-metrics">
          <Metric icon="people" tone="green" label="Asistencia promedio" value={`${presentRate}%`} detail={`${counts.presente} de ${total} registros`} />
          <Metric icon="clock" tone="amber" label="Tardanza promedio" value={`${latenessRate}%`} detail={`${counts.tardanza} de ${total} registros`} />
          <Metric icon="alert" tone="red" label="Ausencia promedio" value={`${absenceRate}%`} detail={`${counts.ausencia} de ${total} registros`} />
          <section className="panel panel-pad report-types-panel">
            <div className="report-types-heading"><Icon name="file" size={16} /><strong>Tipos de reporte</strong></div>
            <div className="report-type-grid">
              <ReportTypeButton selected={reportType === "todos"} tone="green" icon="people" label="Asistencia general" value="todos" count={total} onSelect={setReportType} />
              <ReportTypeButton selected={reportType === "tardanza"} tone="amber" icon="clock" label="Tardanzas" value="tardanza" count={counts.tardanza} onSelect={setReportType} />
              <ReportTypeButton selected={reportType === "ausencia"} tone="red" icon="people" label="Ausencias" value="ausencia" count={counts.ausencia} onSelect={setReportType} />
              <ReportTypeButton selected={reportType === "justificada"} tone="blue" icon="file" label="Justificaciones" value="justificada" count={counts.justificada} onSelect={setReportType} />
            </div>
          </section>
        </div>

        <div className="report-charts">
          <section className="panel report-chart">
            <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="chart" size={17} /></span><div><h2>Asistencia por grupo</h2><p>Porcentaje de asistencia del período</p></div></div><span className="count-chip">Porcentaje</span></div>
            {byArea.length === 0 ? <div className="empty-state">No hay datos para mostrar.</div> : <div className="vertical-bars" aria-label="Porcentaje de asistencia por grupo o área">{byArea.slice(0, 8).map(([name, values]) => { const rate = values.total ? Math.round((values.presente / values.total) * 100) : 0; return <div className="vertical-bar-item" key={name} title={`${name}: ${rate}% de asistencia`}><span className="vertical-bar-value">{rate}%</span><div className="vertical-bar-track"><div className="vertical-bar-fill" style={{ height: `${rate}%` }} /></div><span>{shortLabel(name)}</span></div>; })}</div>}
          </section>

          <section className="panel report-chart">
            <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="chart" size={17} /></span><div><h2>Tendencia mensual</h2><p>Comparativa de asistencia, tardanzas y ausencias</p></div></div><span className="small muted">6 meses</span></div>
            <div className="chart-legend">{statusList.map((item) => <span className="legend-item" key={item.key}><i className="legend-dot" style={{ "--dot-color": item.color } as React.CSSProperties} />{item.label}</span>)}</div>
            <div className="monthly-chart">{monthly.map((month) => <div className="monthly-column" key={month.key}><div className="monthly-stack">{statusList.map((item) => <i key={item.key} className="monthly-segment" title={`${item.label}: ${month.counts[item.key]}`} style={{ height: `${(month.counts[item.key] / maxMonthly) * 100}%`, background: item.color }} />)}</div><span>{month.label}<small>{month.key.slice(0, 4)}</small></span></div>)}</div>
          </section>

          <section className="panel report-chart">
            <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="chart" size={17} /></span><div><h2>Distribución de incidencias</h2><p>Estados en el período</p></div></div></div>
            <div className="donut-layout report-donut">
              <div className="donut-chart" style={{ background: donut }}><div className="donut-center"><strong>{total}</strong><small>registros</small></div></div>
              <div className="legend-list">{statusList.map((item) => <span className="legend-line" key={item.key}><i className="legend-dot" style={{ "--dot-color": item.color } as React.CSSProperties} /><span>{item.label}<br /><strong>{counts[item.key]} · {total ? Math.round((counts[item.key] / total) * 100) : 0}%</strong></span></span>)}</div>
            </div>
          </section>
        </div>

        <section className="panel panel-pad report-results">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="file" size={17} /></span><div><h2>Resultados del reporte</h2><p>Resumen por grupo o área para el período seleccionado</p></div></div><button className="button button-secondary no-print" type="button" onClick={exportCsv} disabled={!filtered.length}><Icon name="download" size={15} />Exportar CSV</button></div>
          {filtered.length === 0 ? <div className="empty-state">No hay registros para el tipo de reporte y período seleccionados.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Grupo / Área</th><th>Presentes</th><th>Tardanzas</th><th>Ausencias</th><th>Justificadas</th><th>Promedio</th></tr></thead><tbody>{resultByArea.map(([name, values]) => <tr key={name}><td><strong>{name}</strong></td><td>{values.presente}</td><td>{values.tardanza}</td><td>{values.ausencia}</td><td>{values.justificada}</td><td><span className="status-pill status-active">{values.total ? Math.round((values.presente / values.total) * 100) : 0}%</span></td></tr>)}</tbody></table></div>}
          <div className="table-footnote">El reporte usa el rol y el grupo o área almacenados en cada persona.</div>
        </section>
      </>}
    </AppShell>
  );
}

function Metric({ icon, tone, label, value, detail }: { icon: string; tone: string; label: string; value: number | string; detail: string }) {
  return <section className="panel metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon} /></span><span className="metric-copy"><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString("es-NI") : value}</strong><small>{detail}</small></span></section>;
}

function ReportTypeButton({ selected, tone, icon, label, value, count, onSelect }: { selected: boolean; tone: string; icon: string; label: string; value: string; count: number; onSelect: (value: string) => void }) {
  return <button className={`report-type-card tone-${tone}${selected ? " selected" : ""}`} type="button" aria-pressed={selected} onClick={() => onSelect(value)}><Icon name={icon} size={18} /><span>{label}</span><small>{count}</small></button>;
}

function donutStyle(counts: Record<string, number>, total: number) {
  if (!total) return "conic-gradient(#e9eef5 0 100%)";
  let cursor = 0;
  const parts = statusList.map((item) => {
    const next = cursor + (counts[item.key] / total) * 100;
    const value = `${item.color} ${cursor}% ${next}%`;
    cursor = next;
    return value;
  });
  return `conic-gradient(${parts.join(",")})`;
}

function shortLabel(value: string) { return value.length > 14 ? `${value.slice(0, 12)}…` : value; }

function roleKey(value: string) {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function aggregateByArea(items: RecordItem[]) {
  const groups = new Map<string, Record<string, number>>();
  items.forEach((item) => {
    const area = item.persona_area || "Sin asignar";
    const current = groups.get(area) ?? { presente: 0, tardanza: 0, ausencia: 0, justificada: 0, total: 0 };
    current[item.estado] = (current[item.estado] ?? 0) + 1;
    current.total += 1;
    groups.set(area, current);
  });
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
