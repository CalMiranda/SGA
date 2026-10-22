"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { useSGAAccess } from "@/lib/access";
import { apiFetch } from "@/lib/api";
import { toCsv } from "@/lib/csv";

type Horario = { id: number; nombre: string; hora_entrada: string; hora_salida: string; tipo: string; dias_aplicables: string[]; area: string; activo: boolean; tolerancia_minutos: number };
type ScheduleForm = { nombre: string; hora_entrada: string; hora_salida: string; tipo: string; dias_aplicables: string[]; area: string; activo: boolean; tolerancia_minutos: string };
const weekDays = [
  { key: "lun", label: "Lun" }, { key: "mar", label: "Mar" }, { key: "mie", label: "Mié" },
  { key: "jue", label: "Jue" }, { key: "vie", label: "Vie" }, { key: "sab", label: "Sáb" }, { key: "dom", label: "Dom" },
];
const cleanForm: ScheduleForm = { nombre: "", hora_entrada: "08:00", hora_salida: "17:00", tipo: "laboral", dias_aplicables: ["lun", "mar", "mie", "jue", "vie"], area: "", activo: true, tolerancia_minutos: "10" };

export default function HorariosPage() {
  const { canWrite } = useSGAAccess();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [form, setForm] = useState<ScheduleForm>(cleanForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [areaFilter, setAreaFilter] = useState("todas");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSchedules = useCallback(async () => {
    try {
      const response = await apiFetch("/api/horarios/", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron consultar los horarios.");
      setHorarios(await response.json());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron consultar los horarios.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { void Promise.resolve().then(loadSchedules); }, [loadSchedules]);

  function refreshSchedules() {
    setLoading(true);
    void loadSchedules();
  }

  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return horarios.filter((item) =>
      `${item.nombre} ${item.area} ${item.tipo}`.toLocaleLowerCase().includes(normalized) &&
      (typeFilter === "todos" || item.tipo === typeFilter) &&
      (areaFilter === "todas" || item.area === areaFilter) &&
      (activeFilter === "todos" || (activeFilter === "activos" ? item.activo : !item.activo))
    );
  }, [horarios, search, typeFilter, areaFilter, activeFilter]);
  const areas = useMemo(() => [...new Set(horarios.map((item) => item.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [horarios]);
  const activeCount = horarios.filter((item) => item.activo).length;
  const areaCount = areas.length;
  const toleranceCount = new Set(horarios.map((item) => item.tolerancia_minutos)).size;
  const averageTolerance = horarios.length
    ? Math.round(horarios.reduce((sum, item) => sum + item.tolerancia_minutos, 0) / horarios.length)
    : 0;
  const academicCount = horarios.filter((item) => item.tipo === "academico").length;
  const laborCount = horarios.filter((item) => item.tipo === "laboral").length;
  function exportCsv() {
    const rows = [["Horario", "Tipo", "Entrada", "Salida", "Tolerancia (min)", "Grupo / Área", "Estado", "Días aplicables"], ...filtered.map((item) => [item.nombre, item.tipo === "academico" ? "Académico" : "Laboral", item.hora_entrada, item.hora_salida, String(item.tolerancia_minutos), item.area, item.activo ? "Activo" : "Inactivo", item.dias_aplicables.join(" ")])];
    const csv = toCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "horarios-institucionales.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  function resetForm() { setForm(cleanForm); setEditing(null); }
  function editSchedule(item: Horario) {
    setEditing(item.id);
    setForm({ nombre: item.nombre, hora_entrada: item.hora_entrada.slice(0, 5), hora_salida: item.hora_salida.slice(0, 5), tipo: item.tipo ?? "laboral", dias_aplicables: item.dias_aplicables ?? [], area: item.area ?? "Sin asignar", activo: item.activo ?? true, tolerancia_minutos: String(item.tolerancia_minutos) });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(editing === null ? "/api/horarios/" : `/api/horarios/${editing}/`, {
        method: editing === null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim(), hora_entrada: form.hora_entrada, hora_salida: form.hora_salida, tipo: form.tipo, dias_aplicables: form.dias_aplicables, area: form.area.trim(), activo: form.activo, tolerancia_minutos: Number(form.tolerancia_minutos) }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        if (detail?.nombre) throw new Error("Ya existe un horario con ese nombre.");
        if (detail?.hora_salida) throw new Error("La salida debe ser posterior a la hora de entrada.");
        throw new Error("No fue posible guardar el horario. Revisa los datos.");
      }
      setMessage(editing === null ? "Horario registrado correctamente." : "Horario actualizado correctamente.");
      resetForm();
      await loadSchedules();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible guardar el horario.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleScheduleActive(item: Horario) {
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`/api/horarios/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !item.activo }),
      });
      if (!response.ok) throw new Error("No fue posible actualizar el estado del horario.");
      setMessage(`Horario ${item.activo ? "desactivado" : "activado"} correctamente.`);
      await loadSchedules();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible actualizar el estado del horario.");
    }
  }

  return (
    <AppShell title="Gestión de Horarios" subtitle="Configura los horarios institucionales y sus reglas de tolerancia">
      <div className="metric-grid three-metrics">
        <Metric icon="calendar" tone="green" label="Horarios activos" value={activeCount} detail={`De ${horarios.length} configurados`} />
        <Metric icon="people" tone="blue" label="Grupos configurados" value={areaCount} detail="Áreas con horarios" />
        <Metric icon="file" tone="amber" label="Reglas de tolerancia" value={toleranceCount} detail="Valores distintos en uso" />
      </div>
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="schedule-layout">
        <section className="panel panel-pad">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name={editing === null ? "plus" : "edit"} size={17} /></span><div><h2>{editing === null ? "Crear horario" : "Editar horario"}</h2><p>Define entrada, salida y tolerancia</p></div></div></div>
          {!canWrite && <p className="access-note">Tu rol permite consultar los horarios; la creación y edición están reservadas a Administración y Gestión de asistencia.</p>}
          <form className="form-fields" onSubmit={saveSchedule}>
            <fieldset className="form-fieldset" disabled={!canWrite}>
            <label className="field-label">Nombre del horario *<input className="control" required maxLength={100} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Ej. Horario administrativo" /></label>
            <label className="field-label">Tipo *<select className="control-select" required value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}><option value="laboral">Laboral</option><option value="academico">Académico</option></select></label>
            <div className="form-row">
              <label className="field-label">Hora de entrada *<input className="control" type="time" required value={form.hora_entrada} onChange={(event) => setForm({ ...form, hora_entrada: event.target.value })} /></label>
              <label className="field-label">Hora de salida *<input className="control" type="time" required value={form.hora_salida} onChange={(event) => setForm({ ...form, hora_salida: event.target.value })} /></label>
            </div>
            <label className="field-label">Tolerancia (minutos) *<input className="control" type="number" min={0} max={240} required value={form.tolerancia_minutos} onChange={(event) => setForm({ ...form, tolerancia_minutos: event.target.value })} /><small className="field-hint">Minutos permitidos antes de clasificar una entrada como tardanza.</small></label>
            <div className="field-label">Días aplicables *<div className="day-select-grid">{weekDays.map((day) => <label className={`day-choice${form.dias_aplicables.includes(day.key) ? " selected" : ""}`} key={day.key}><input type="checkbox" checked={form.dias_aplicables.includes(day.key)} onChange={(event) => setForm({ ...form, dias_aplicables: event.target.checked ? [...form.dias_aplicables, day.key] : form.dias_aplicables.filter((value) => value !== day.key) })} /><span>{day.label}</span></label>)}</div></div>
            <label className="field-label">Grupo / Área *<input className="control" required maxLength={100} list="schedule-areas" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="Ej. Administración" /><datalist id="schedule-areas">{areas.map((area) => <option value={area} key={area} />)}</datalist></label>
            <label className="active-toggle"><input type="checkbox" checked={form.activo} onChange={(event) => setForm({ ...form, activo: event.target.checked })} /><span><strong>Horario activo</strong><small>Disponible para registrar asistencia</small></span></label>
            <div className="table-toolbar"><button className="button button-primary" type="submit" disabled={saving}><Icon name={editing === null ? "plus" : "file"} size={16} />{saving ? "Guardando..." : editing === null ? "Guardar horario" : "Guardar cambios"}</button>{editing !== null && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar</button>}</div>
            </fieldset>
          </form>
        </section>

        <section className="panel panel-pad">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="calendar" size={17} /></span><div><h2>Horarios registrados</h2><p>Lista de horarios configurados</p></div></div><div className="table-toolbar"><button className="button button-secondary" type="button" onClick={exportCsv} disabled={!filtered.length}><Icon name="download" size={15} />Exportar</button><button className="button button-secondary" type="button" onClick={refreshSchedules} disabled={loading}><Icon name="refresh" size={15} />Actualizar</button></div></div>
          <div className="table-toolbar list-filters"><label className="search-control"><Icon name="search" size={16} /><input className="control" aria-label="Buscar horario" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o grupo..." /></label><select className="control-select" aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="todos">Todos los tipos</option><option value="laboral">Laboral</option><option value="academico">Académico</option></select><select className="control-select" aria-label="Filtrar por área" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="todas">Todas las áreas</option>{areas.map((area) => <option value={area} key={area}>{area}</option>)}</select><select className="control-select" aria-label="Filtrar por estado" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}><option value="todos">Todos los estados</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></div>
          {loading ? <div className="loading-state">Consultando horarios...</div> : filtered.length === 0 ? <div className="empty-state">No hay horarios que coincidan con la búsqueda.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Horario</th><th>Tipo</th><th>Entrada</th><th>Salida</th><th>Tolerancia</th><th>Grupo / Área</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><span className="schedule-name"><i className={item.tipo === "academico" ? "schedule-dot academic" : "schedule-dot"} /> <strong>{item.nombre}</strong></span></td><td><span className={`schedule-type ${item.tipo === "academico" ? "academic" : "labor"}`}>{item.tipo === "academico" ? "Académico" : "Laboral"}</span></td><td>{item.hora_entrada.slice(0, 5)}</td><td>{item.hora_salida.slice(0, 5)}</td><td><span className="status-pill status-info">{item.tolerancia_minutos} min</span></td><td>{item.area}</td><td><span className={`status-pill ${item.activo ? "status-active" : "status-inactive"}`}>{item.activo ? "Activo" : "Inactivo"}</span></td><td>{canWrite ? <div className="table-toolbar row-actions"><button className="button button-quiet" type="button" onClick={() => editSchedule(item)} aria-label={`Editar ${item.nombre}`}><Icon name="edit" size={14} />Editar</button><button className="button button-quiet" type="button" onClick={() => void toggleScheduleActive(item)} aria-label={`${item.activo ? "Desactivar" : "Activar"} ${item.nombre}`}>{item.activo ? "Desactivar" : "Activar"}</button></div> : <span className="muted small">Consulta</span>}</td></tr>)}</tbody></table></div>}
          <div className="table-footnote">Se muestran {filtered.length} de {horarios.length} horarios configurados.</div>
        </section>
      </div>

      <section className="panel panel-pad rule-summary-panel">
        <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="settings" size={17} /></span><div><h2>Reglas rápidas</h2><p>Resumen de las reglas guardadas en los horarios</p></div></div></div>
        <div className="rule-summary-grid">
          <div className="rule-summary-card tone-green"><Icon name="clock" /><span><strong>Tolerancia promedio</strong><small>{averageTolerance} minutos configurados</small></span></div>
          <div className="rule-summary-card tone-blue"><Icon name="calendar" /><span><strong>Tipos de jornada</strong><small>{laborCount} laborales · {academicCount} académicos</small></span></div>
          <div className="rule-summary-card tone-amber"><Icon name="check" /><span><strong>Disponibilidad</strong><small>{activeCount} horarios activos de {horarios.length}</small></span></div>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ icon, tone, label, value, detail, suffix = "" }: { icon: string; tone: string; label: string; value: number | string; detail: string; suffix?: string }) {
  return <section className="panel metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon} /></span><span className="metric-copy"><span>{label}</span><strong>{value}{suffix}</strong><small>{detail}</small></span></section>;
}
