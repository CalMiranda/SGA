"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type Persona = { id: number; activo: boolean; rol: string; area: string };
type Horario = { id: number; nombre: string; activo: boolean };
type Asistencia = {
  id: number;
  persona_codigo: string;
  persona_nombre: string;
  persona_rol: string;
  persona_area: string;
  horario_nombre: string;
  fecha: string;
  hora_registro: string;
  estado: string;
  estado_display: string;
  observacion: string;
  fecha_creacion: string;
};

const colors: Record<string, string> = {
  presente: "#173c68",
  tardanza: "#f2aa24",
  ausencia: "#e94d59",
  justificada: "#357de0",
};

export default function DashboardPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const [peopleResponse, schedulesResponse, attendanceResponse] = await Promise.all([
        apiFetch("/api/personas/", { cache: "no-store" }),
        apiFetch("/api/horarios/", { cache: "no-store" }),
        apiFetch("/api/asistencias/", { cache: "no-store" }),
      ]);
      if (!peopleResponse.ok || !schedulesResponse.ok || !attendanceResponse.ok) {
        throw new Error("No fue posible consultar todos los módulos del dashboard.");
      }
      const [people, schedules, records]: [Persona[], Horario[], Asistencia[]] = await Promise.all([
        peopleResponse.json(), schedulesResponse.json(), attendanceResponse.json(),
      ]);
      setPersonas(people);
      setHorarios(schedules);
      setAsistencias(records);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { void Promise.resolve().then(loadDashboard); }, [loadDashboard]);

  const today = localDateKey(new Date());
  const todayRecords = useMemo(() => asistencias.filter((item) => item.fecha === today), [asistencias, today]);
  const counts = useMemo(() => countStatuses(todayRecords), [todayRecords]);
  const week = useMemo(() => {
    const max = new Date();
    max.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(max);
      date.setDate(max.getDate() - (6 - index));
      const key = localDateKey(date);
      const dayRecords = asistencias.filter((item) => item.fecha === key);
      return { key, label: new Intl.DateTimeFormat("es-NI", { weekday: "short" }).format(date).replace(".", ""), counts: countStatuses(dayRecords) };
    });
  }, [asistencias]);
  const weekMax = Math.max(1, ...week.map((day) => Object.values(day.counts).reduce((sum, value) => sum + value, 0)));
  const recent = todayRecords.slice(0, 5);

  const donutBackground = useMemo(() => {
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (!total) return "conic-gradient(#e9eef5 0 100%)";
    let cursor = 0;
    const stops = Object.entries(colors).map(([status, color]) => {
      const next = cursor + (counts[status] / total) * 100;
      const stop = `${color} ${cursor}% ${next}%`;
      cursor = next;
      return stop;
    });
    return `conic-gradient(${stops.join(",")})`;
  }, [counts]);

  return (
    <AppShell title="Dashboard" subtitle="Resumen general de los registros de asistencia institucional">
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading ? <section className="panel loading-state" role="status">Cargando información institucional...</section> : <>
        <div className="metric-grid">
          <Metric icon="check" tone="green" label="Asistencias de hoy" value={todayRecords.length} detail={`${personas.filter((person) => person.activo).length} personas activas`} />
          <Metric icon="clock" tone="amber" label="Tardanzas" value={counts.tardanza} detail={share(counts.tardanza, todayRecords.length)} />
          <Metric icon="people" tone="red" label="Ausencias" value={counts.ausencia} detail={share(counts.ausencia, todayRecords.length)} />
          <Metric icon="file" tone="blue" label="Justificadas" value={counts.justificada} detail={share(counts.justificada, todayRecords.length)} />
        </div>

        <div className="dashboard-grid">
          <section className="panel chart-panel weekly-panel">
            <div className="panel-heading">
              <div className="panel-title"><span className="panel-title-icon"><Icon name="chart" size={17} /></span><div><h2>Asistencia semanal</h2><p>Registros por estado en los últimos siete días</p></div></div>
              <span className="small muted">Últimos 7 días</span>
            </div>
            <div className="chart-legend">
              {Object.entries({ presente: "Presentes", tardanza: "Tardanzas", ausencia: "Ausencias", justificada: "Justificadas" }).map(([status, label]) => <span className="legend-item" key={status}><i className="legend-dot" style={{ "--dot-color": colors[status] } as React.CSSProperties} />{label}</span>)}
            </div>
            <div className="bar-chart" aria-label="Gráfico de registros de asistencia por día">
              {week.map((day) => <div className="bar-column" key={day.key}>
                <div className="bar-stack" title={`${day.key}: ${Object.values(day.counts).reduce((sum, count) => sum + count, 0)} registros`}>
                  {Object.entries(colors).map(([status, color]) => <i key={status} className="bar" style={{ height: `${(day.counts[status] / weekMax) * 100}%`, "--bar-color": color } as React.CSSProperties} />)}
                </div>
                <span className="bar-label">{day.label}</span>
              </div>)}
            </div>
          </section>

          <section className="panel chart-panel states-panel">
            <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="chart" size={17} /></span><div><h2>Distribución de estados</h2><p>Registros de asistencia de hoy</p></div></div></div>
            <div className="donut-layout">
              <div className="donut-chart" style={{ background: donutBackground }} aria-label="Distribución de estados de asistencia"><div className="donut-center"><strong>{todayRecords.length}</strong><small>registros</small></div></div>
              <div className="legend-list">
                {Object.entries({ presente: "Presentes", tardanza: "Tardanzas", ausencia: "Ausencias", justificada: "Justificadas" }).map(([status, label]) => <span className="legend-line" key={status}><i className="legend-dot" style={{ "--dot-color": colors[status] } as React.CSSProperties} /><span>{label}<br /><strong>{counts[status]} · {share(counts[status], todayRecords.length)}</strong></span></span>)}
              </div>
            </div>
          </section>

          <section className="panel chart-panel quick-panel">
            <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="arrow" size={17} /></span><div><h2>Acciones rápidas</h2><p>Accesos a los módulos</p></div></div></div>
            <div className="quick-grid">
              <Quick href="/asistencias" icon="check" tone="green" label="Registrar asistencia" />
              <Quick href="/horarios" icon="calendar" tone="blue" label="Gestionar horarios" />
              <Quick href="/incidencias" icon="alert" tone="amber" label="Revisar incidencias" />
              <Quick href="/reportes" icon="chart" tone="purple" label="Generar reporte" />
            </div>
            <div className="dashboard-counts"><span><Icon name="people" size={15} />{personas.filter((person) => person.activo).length} personas activas</span><span><Icon name="calendar" size={15} />{horarios.filter((item) => item.activo).length} horarios activos</span></div>
          </section>

        <section className="panel recent-panel dashboard-recent">
          <div className="panel-heading">
            <div className="panel-title"><span className="panel-title-icon"><Icon name="file" size={17} /></span><div><h2>Registros recientes</h2><p>Últimos registros de asistencia guardados</p></div></div>
            <Link className="button button-secondary" href="/asistencias">Ver todos <Icon name="arrow" size={15} /></Link>
          </div>
          {recent.length === 0 ? <div className="empty-state">Todavía no hay registros de asistencia para hoy.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Fecha y hora</th><th>Persona</th><th>Rol</th><th>Grupo / Área</th><th>Estado</th><th>Observación</th></tr></thead><tbody>
            {recent.map((record, index) => <tr key={record.id}><td>{index + 1}</td><td>{formatAttendanceTime(record.fecha, record.hora_registro)}</td><td><strong>{record.persona_nombre}</strong><small className="cell-secondary">{record.persona_codigo}</small></td><td>{record.persona_rol}</td><td>{record.persona_area}</td><td><Status value={record.estado} label={record.estado_display} /></td><td>{record.observacion || "—"}</td></tr>)}
          </tbody></table></div>}
        </section>

        <section className="panel panel-pad activity-panel">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="clock" size={17} /></span><div><h2>Actividad reciente</h2><p>Movimientos de asistencia registrados hoy</p></div></div></div>
          {recent.length === 0 ? <div className="empty-state">No hay actividad registrada hoy.</div> : <div className="activity-list">{recent.map((record) => <Activity key={record.id} record={record} />)}</div>}
        </section>
        </div>
      </>}
    </AppShell>
  );
}

function Metric({ icon, tone, label, value, detail }: { icon: string; tone: string; label: string; value: number; detail: string }) {
  return <section className="panel metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon} /></span><span className="metric-copy"><span>{label}</span><strong>{value.toLocaleString("es-NI")}</strong><small>{detail}</small></span></section>;
}

function Quick({ href, icon, tone, label }: { href: string; icon: string; tone: string; label: string }) {
  return <Link className={`quick-action tone-${tone}`} href={href}><Icon name={icon} />{label}</Link>;
}

function Activity({ record }: { record: Asistencia }) {
  const labels: Record<string, string> = { presente: "Se registró una asistencia", tardanza: "Se registró una tardanza", ausencia: "Se registró una ausencia", justificada: "Se registró una justificación" };
  const icons: Record<string, string> = { presente: "check", tardanza: "clock", ausencia: "alert", justificada: "file" };
  return <div className="activity-item"><span className={`activity-icon activity-${record.estado}`}><Icon name={icons[record.estado] ?? "file"} size={15} /></span><span className="activity-copy"><strong>{labels[record.estado] ?? "Se actualizó un registro"}</strong><small>{record.persona_nombre} · {record.persona_rol}</small><small>{record.persona_area} · {record.hora_registro.slice(0, 5)}</small></span></div>;
}

export function Status({ value, label }: { value: string; label: string }) {
  const className = value === "presente" ? "status-present" : value === "tardanza" ? "status-late" : value === "ausencia" ? "status-absent" : value === "justificada" ? "status-justified" : "status-info";
  return <span className={`status-pill ${className}`}>{label}</span>;
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function countStatuses(records: Pick<Asistencia, "estado">[]) {
  return records.reduce<Record<string, number>>((result, record) => {
    result[record.estado] = (result[record.estado] ?? 0) + 1;
    return result;
  }, { presente: 0, tardanza: 0, ausencia: 0, justificada: 0 });
}

function formatAttendanceTime(date: string, time: string) {
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? `${date} ${time.slice(0, 5)}` : new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}

function share(count: number, total: number) {
  return total ? `${Math.round((count / total) * 100)}% del total` : "Sin registros";
}
