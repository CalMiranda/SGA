"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { useSGAAccess } from "@/lib/access";
import { apiFetch } from "@/lib/api";
import { toCsv } from "@/lib/csv";

type Persona = { id: number; codigo: string; nombres: string; apellidos: string; correo: string; rol: string; area: string; activo: boolean };
type Horario = { id: number; nombre: string; hora_entrada: string; hora_salida: string; tipo: string; dias_aplicables: string[]; area: string; activo: boolean };
type Registro = { id: number; persona: number; persona_codigo: string; persona_nombre: string; persona_rol: string; persona_area: string; horario: number; horario_nombre: string; fecha: string; hora_registro: string; estado: string; estado_display: string; observacion: string };
const stateOptions = [
  { value: "presente", label: "Presente", tone: "green" },
  { value: "tardanza", label: "Tardanza", tone: "amber" },
  { value: "ausencia", label: "Ausencia", tone: "red" },
  { value: "justificada", label: "Justificada", tone: "purple" },
];

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AsistenciasPage() {
  const { canWrite } = useSGAAccess();
  const [people, setPeople] = useState<Persona[]>([]);
  const [schedules, setSchedules] = useState<Horario[]>([]);
  const [records, setRecords] = useState<Registro[]>([]);
  const [person, setPerson] = useState("");
  const [personCode, setPersonCode] = useState("");
  const [schedule, setSchedule] = useState("");
  const [date, setDate] = useState(todayKey);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [status, setStatus] = useState("presente");
  const [observation, setObservation] = useState("");
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("todas");
  const [scheduleFilter, setScheduleFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [personResponse, scheduleResponse, recordResponse] = await Promise.all([
        apiFetch("/api/personas/", { cache: "no-store" }),
        apiFetch("/api/horarios/", { cache: "no-store" }),
        apiFetch("/api/asistencias/", { cache: "no-store" }),
      ]);
      if (!personResponse.ok || !scheduleResponse.ok || !recordResponse.ok) throw new Error("No se pudo cargar la información de asistencia.");
      const [personData, scheduleData, recordData]: [Persona[], Horario[], Registro[]] = await Promise.all([
        personResponse.json(), scheduleResponse.json(), recordResponse.json(),
      ]);
      setPeople(personData);
      setSchedules(scheduleData);
      setRecords(recordData);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la información de asistencia.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { void Promise.resolve().then(loadData); }, [loadData]);

  const dayRecords = useMemo(() => records.filter((record) => record.fecha === date), [records, date]);
  const selectedPerson = useMemo(() => people.find((item) => String(item.id) === person), [people, person]);
  const personSchedules = useMemo(() => schedules.filter((item) => {
    if (!item.activo || !selectedPerson || item.area.toLocaleLowerCase() !== selectedPerson.area.toLocaleLowerCase()) return false;
    if (selectedPerson.rol !== "estudiante") return true;
    if (item.tipo !== "academico") return false;
    const year = Number(selectedPerson.area.match(/^([1-5])[STM]\d+-SIS-S$/i)?.[1]);
    const semester = romanSemester(item.nombre);
    return !year || semester === year * 2 - 1 || semester === year * 2;
  }), [schedules, selectedPerson]);
  useEffect(() => {
    if (!personSchedules.some((item) => String(item.id) === schedule)) {
      setSchedule(String(personSchedules[0]?.id ?? ""));
    }
  }, [personSchedules, schedule]);
  const totals = useMemo(() => dayRecords.reduce<Record<string, number>>((result, record) => {
    result[record.estado] = (result[record.estado] ?? 0) + 1;
    return result;
  }, { presente: 0, tardanza: 0, ausencia: 0, justificada: 0 }), [dayRecords]);
  const visibleRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return dayRecords.filter((record) => {
      const matchQuery = !query || `${record.persona_codigo} ${record.persona_nombre}`.toLocaleLowerCase().includes(query);
      const matchArea = areaFilter === "todas" || record.persona_area === areaFilter;
      const matchSchedule = scheduleFilter === "todos" || record.horario === Number(scheduleFilter);
      return matchQuery && matchArea && matchSchedule;
    });
  }, [dayRecords, search, areaFilter, scheduleFilter]);
  const areas = useMemo(() => [...new Set(people.map((item) => item.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [people]);

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch("/api/asistencias/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: Number(person), horario: Number(schedule), fecha: date, hora_registro: time, estado: status, observacion: observation.trim() }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const first = Object.values(detail as Record<string, unknown>)[0];
        if (Array.isArray(first) && String(first[0]).includes("Ya existe")) throw new Error(String(first[0]));
        if (Array.isArray(first)) throw new Error(String(first[0]));
        throw new Error("No fue posible registrar la asistencia. Verifica persona, horario y fecha.");
      }
      setMessage("Asistencia registrada correctamente.");
      setPerson("");
      setPersonCode("");
      setObservation("");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible registrar la asistencia.");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const values = [["Fecha", "Hora", "Código", "Persona", "Horario", "Estado", "Observación"], ...visibleRecords.map((record) => [record.fecha, record.hora_registro, record.persona_codigo, record.persona_nombre, record.horario_nombre, record.estado_display, record.observacion])];
    const csv = toCsv(values);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistencia-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Registro de Asistencia" subtitle="Control diario de entrada, salida y clasificación de asistencia">
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <section className="panel filter-row">
        <label className="field-label">Fecha<input className="control" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field-label">Grupo / Área<select className="control-select" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="todas">Todas las áreas</option>{areas.map((area) => <option value={area} key={area}>{area}</option>)}</select></label>
        <label className="field-label">Horario<select className="control-select" value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)}><option value="todos">Todos los horarios</option>{schedules.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></label>
        <label className="field-label">Buscar persona o código<input className="control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, código o identificación..." /></label>
      </section>

      <div className="attendance-layout">
        <section id="attendance-entry" className="panel panel-pad">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon tone-green"><Icon name="plus" size={17} /></span><div><h2>Registrar asistencia</h2><p>Selecciona la persona y el horario para crear un registro</p></div></div></div>
          {!canWrite ? <p className="access-note">Tu rol permite consultar los registros; el ingreso de asistencia está reservado a Administración y Gestión de asistencia.</p> : loading ? <div className="loading-state">Cargando personas y horarios...</div> : people.length === 0 || schedules.length === 0 ? <div className="empty-state">Para registrar asistencia, agrega al menos una persona activa y un horario.</div> : (
            <form onSubmit={saveRecord} className="form-fields">
              <div className="attendance-form-grid">
                <label className="field-label">Código o identificación<input className="control" value={personCode} onChange={(event) => { const code = event.target.value; setPersonCode(code); const match = people.find((item) => item.codigo.toLocaleLowerCase() === code.trim().toLocaleLowerCase()); setPerson(match ? String(match.id) : ""); }} placeholder="Ej. UNI001" /></label>
                <label className="field-label">Persona *<select className="control-select" required value={person} onChange={(event) => { const selected = people.find((item) => String(item.id) === event.target.value); setPerson(event.target.value); setPersonCode(selected?.codigo ?? ""); }}><option value="">Buscar persona...</option>{people.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombres} {item.apellidos}</option>)}</select></label>
                <label className="field-label">Clase según grupo y año *<select className="control-select" required value={schedule} onChange={(event) => setSchedule(event.target.value)} disabled={!selectedPerson || personSchedules.length === 0}><option value="">{selectedPerson ? "No hay clases para este grupo" : "Selecciona primero un estudiante"}</option>{personSchedules.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
                <label className="field-label">Hora *<input className="control" type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></label>
                <label className="field-label">Estado *<span className="state-select-grid">{stateOptions.map((option) => <label className={`state-choice tone-${option.tone}`} key={option.value}><input type="radio" name="attendance-state" value={option.value} checked={status === option.value} onChange={(event) => setStatus(event.target.value)} /><span>{option.label}</span></label>)}</span></label>
              </div>
              <label className="field-label">Observación<textarea className="control-textarea" maxLength={250} value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Añade una observación opcional" /></label>
              <div className="attendance-submit-row"><span className="muted small">Un registro por persona, horario y fecha.</span><button className="button button-primary" type="submit" disabled={saving}><Icon name="plus" size={16} />{saving ? "Registrando..." : "Registrar"}</button></div>
            </form>
          )}
        </section>

        <section className="panel panel-pad">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="chart" size={17} /></span><div><h2>Resumen del día</h2><p>{formatDate(date)} · {dayRecords.length} registros</p></div></div></div>
          <div className="day-summary">
            <Summary tone="green" value={totals.presente} total={dayRecords.length} label="Presentes" />
            <Summary tone="amber" value={totals.tardanza} total={dayRecords.length} label="Tardanzas" />
            <Summary tone="red" value={totals.ausencia} total={dayRecords.length} label="Ausencias" />
            <Summary tone="purple" value={totals.justificada} total={dayRecords.length} label="Justificadas" />
          </div>
        </section>
      </div>

      <div className="attendance-bottom-layout">
      <section className="panel panel-pad attendance-list-panel">
        <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="file" size={17} /></span><div><h2>Asistencia del día</h2><p>Entradas, salidas y estados registrados</p></div></div><button className="button button-secondary" type="button" onClick={exportCsv} disabled={!visibleRecords.length}><Icon name="download" size={15} />Exportar CSV</button></div>
        {loading ? <div className="loading-state">Consultando registros...</div> : visibleRecords.length === 0 ? <div className="empty-state">No hay registros para los filtros seleccionados.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Hora</th><th>Código</th><th>Persona</th><th>Rol</th><th>Grupo / Área</th><th>Horario</th><th>Estado</th><th>Observación</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.id}><td>{record.hora_registro.slice(0, 5)}</td><td><strong>{record.persona_codigo}</strong></td><td>{record.persona_nombre}</td><td>{record.persona_rol}</td><td>{record.persona_area}</td><td>{record.horario_nombre}</td><td><Status value={record.estado} label={record.estado_display} /></td><td>{record.observacion || "—"}</td></tr>)}</tbody></table></div>}
        <div className="table-footnote">Mostrando {visibleRecords.length} de {dayRecords.length} registros del día.</div>
      </section>
      <section className="panel panel-pad attendance-quick-panel">
        <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="arrow" size={17} /></span><div><h2>Acciones rápidas</h2><p>Herramientas para el control diario</p></div></div></div>
        <div className="attendance-quick-grid">
          {canWrite && <Link className="attendance-quick-card tone-green" href="#attendance-entry"><Icon name="people" /><span><strong>Registrar manualmente</strong><small>Agregar una asistencia</small></span><Icon name="arrow" size={15} /></Link>}
          <Link className="attendance-quick-card tone-amber" href="/incidencias"><Icon name="alert" /><span><strong>Revisar incidencias</strong><small>Gestionar casos registrados</small></span><Icon name="arrow" size={15} /></Link>
          <Link className="attendance-quick-card tone-purple" href="/reportes"><Icon name="chart" /><span><strong>Generar corte del día</strong><small>Consultar reportes</small></span><Icon name="arrow" size={15} /></Link>
          <Link className="attendance-quick-card tone-blue" href="/horarios"><Icon name="calendar" /><span><strong>Gestionar horarios</strong><small>Ver las jornadas activas</small></span><Icon name="arrow" size={15} /></Link>
        </div>
        <button className="button button-secondary attendance-export" type="button" onClick={exportCsv} disabled={!visibleRecords.length}><Icon name="download" size={15} />Descargar registros CSV</button>
      </section>
      </div>
    </AppShell>
  );
}

function Summary({ tone, value, total, label }: { tone: string; value: number; total: number; label: string }) {
  return <div className={`summary-tile tone-${tone}`}><strong>{value}</strong><span>{label}</span><small>{total ? `${Math.round((value / total) * 100)}% del total` : "0% del total"}</small></div>;
}

function Status({ value, label }: { value: string; label: string }) {
  const className = value === "presente" ? "status-present" : value === "tardanza" ? "status-late" : value === "ausencia" ? "status-absent" : "status-justified";
  return <span className={`status-pill ${className}`}>{label}</span>;
}

function formatDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function romanSemester(name: string) {
  const roman = name.match(/^(VIII|VII|VI|IV|III|II|IX|X|V|I)\s+Semestre\b/i)?.[1]?.toUpperCase();
  return roman ? ({ I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 } as const)[roman as "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | "X"] : 0;
}
