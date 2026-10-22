"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import AppShell, { Icon } from "@/components/AppShell";
import { useSGAAccess } from "@/lib/access";
import { apiFetch } from "@/lib/api";
import { toCsv } from "@/lib/csv";

type Persona = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
  area: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

type FormState = { codigo: string; nombres: string; apellidos: string; correo: string; rol: string; area: string; activo: boolean };
const blankForm: FormState = { codigo: "", nombres: "", apellidos: "", correo: "", rol: "", area: "", activo: true };
const roleOptions = [
  { value: "estudiante", label: "Estudiante" },
  { value: "docente", label: "Docente" },
  { value: "administrativo", label: "Administrativo" },
  { value: "otro", label: "Otro" },
];

export default function PersonasPage() {
  return <Suspense fallback={<main className="guard-state" role="status">Cargando personas...</main>}><PersonasContent /></Suspense>;
}

function PersonasContent() {
  const { canWrite } = useSGAAccess();
  const searchParams = useSearchParams();
  const query = searchParams.get("buscar") ?? "";
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [form, setForm] = useState<FormState>(blankForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const searchValue = search ?? query;
  const [roleFilter, setRoleFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPeople = useCallback(async () => {
    try {
      const response = await apiFetch("/api/personas/", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo consultar el listado de personas.");
      const data: Persona[] = await response.json();
      setPersonas(data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar el listado de personas.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { void Promise.resolve().then(loadPeople); }, [loadPeople]);
  const activeCount = personas.filter((person) => person.activo).length;
  const inactiveCount = personas.length - activeCount;
  const filteredPeople = useMemo(() => {
    const normalized = searchValue.trim().toLocaleLowerCase();
    return personas.filter((person) => {
      const matchesSearch = !normalized ||
        `${person.codigo} ${person.nombres} ${person.apellidos} ${person.correo}`.toLocaleLowerCase().includes(normalized);
      const matchesRole = roleFilter === "todos" || person.rol === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [personas, searchValue, roleFilter]);
  const areas = useMemo(() => [...new Set(personas.map((person) => person.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [personas]);

  function refreshPeople() {
    setLoading(true);
    void loadPeople();
  }

  function resetForm() {
    setForm(blankForm);
    setEditing(null);
  }

  function startEditing(person: Persona) {
    setEditing(person.id);
    setForm({ codigo: person.codigo, nombres: person.nombres, apellidos: person.apellidos, correo: person.correo ?? "", rol: person.rol ?? "otro", area: person.area ?? "Sin asignar", activo: person.activo });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch(
        editing === null ? "/api/personas/" : `/api/personas/${editing}/`,
        {
          method: editing === null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo: form.codigo.trim(),
            nombres: form.nombres.trim(),
            apellidos: form.apellidos.trim(),
            correo: form.correo.trim(),
            rol: form.rol,
            area: form.area.trim(),
            activo: form.activo,
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        if (detail?.codigo) throw new Error("Ese código ya está registrado.");
        throw new Error("No fue posible guardar la persona. Revisa los datos e inténtalo de nuevo.");
      }
      setMessage(editing === null ? "Persona registrada correctamente." : "Cambios guardados correctamente.");
      resetForm();
      await loadPeople();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible guardar la persona.");
    } finally {
      setSaving(false);
    }
  }

  async function changeActive(person: Persona) {
    const action = person.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Deseas ${action} a ${person.nombres} ${person.apellidos}?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`/api/personas/${person.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !person.activo }),
      });
      if (!response.ok) throw new Error("No fue posible actualizar el estado.");
      setMessage(`Persona ${person.activo ? "desactivada" : "activada"} correctamente.`);
      await loadPeople();
    } catch {
      setError("No fue posible actualizar el estado de la persona.");
    }
  }

  function exportCsv() {
    const rows = [
      ["Código", "Nombres", "Apellidos", "Correo", "Rol", "Grupo / Área", "Estado"],
      ...filteredPeople.map((person) => [person.codigo, person.nombres, person.apellidos, person.correo, roleLabel(person.rol), person.area, person.activo ? "Activo" : "Inactivo"]),
    ];
    const csv = toCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "personas-sga.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Gestión de Personas" subtitle="Administra los registros institucionales disponibles en el SGA">
      <div className="metric-grid three-metrics">
        <Metric icon="people" tone="green" label="Total de personas" value={personas.length} detail="Registros institucionales" />
        <Metric icon="check" tone="blue" label="Activas" value={activeCount} detail={personas.length ? `${Math.round((activeCount / personas.length) * 100)}% del total` : "Sin registros"} />
        <Metric icon="people" tone="red" label="Inactivas" value={inactiveCount} detail="No disponibles para asistencia" />
      </div>

      {message && <div className="alert alert-success" role="status">{message}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="persona-layout">
        <section className="panel panel-pad">
          <div className="panel-heading">
            <div className="panel-title">
              <span className="panel-title-icon"><Icon name={editing === null ? "plus" : "edit"} size={17} /></span>
              <div><h2>{editing === null ? "Registrar persona" : "Editar persona"}</h2><p>Completa los datos para crear un nuevo registro</p></div>
            </div>
          </div>
          {!canWrite && <p className="access-note">Tu rol permite consultar los registros; la creación y edición están reservadas a Administración y Gestión de asistencia.</p>}
          <form className="form-fields" onSubmit={savePerson}>
            <fieldset className="form-fieldset" disabled={!canWrite}>
            <label className="field-label">Código institucional *<input className="control" required maxLength={30} value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} placeholder="Ej. EST001" /></label>
            <label className="field-label">Nombres *<input className="control" required maxLength={100} value={form.nombres} onChange={(event) => setForm({ ...form, nombres: event.target.value })} placeholder="Ingresa los nombres" /></label>
            <label className="field-label">Apellidos *<input className="control" required maxLength={100} value={form.apellidos} onChange={(event) => setForm({ ...form, apellidos: event.target.value })} placeholder="Ingresa los apellidos" /></label>
            <label className="field-label">Correo *<input className="control" required type="email" maxLength={254} value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} placeholder="ejemplo@uni.edu.ni" /></label>
            <label className="field-label">Rol *<select className="control-select" required value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}><option value="">Selecciona un rol</option>{roleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <label className="field-label">Grupo / Área *<input className="control" required maxLength={100} list="persona-areas" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="Selecciona o escribe un área" /><datalist id="persona-areas">{areas.map((area) => <option value={area} key={area} />)}</datalist></label>
            <label className="active-toggle"><input type="checkbox" checked={form.activo} onChange={(event) => setForm({ ...form, activo: event.target.checked })} /><span><strong>Persona activa</strong><small>Puede recibir registros de asistencia</small></span></label>
            <div className="table-toolbar">
              <button className="button button-primary" type="submit" disabled={saving}><Icon name={editing === null ? "plus" : "file"} size={16} />{saving ? "Guardando..." : editing === null ? "Guardar registro" : "Guardar cambios"}</button>
              {editing !== null && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar</button>}
            </div>
            </fieldset>
          </form>
        </section>

        <section className="panel panel-pad">
          <div className="panel-heading">
            <div className="panel-title"><span className="panel-title-icon"><Icon name="people" size={17} /></span><div><h2>Listado de personas</h2><p>Consulta y administra los registros disponibles</p></div></div>
            <button className="button button-secondary" type="button" onClick={exportCsv} disabled={!filteredPeople.length}><Icon name="download" size={15} />Exportar CSV</button>
          </div>
          <div className="table-toolbar list-filters">
            <label className="search-control"><Icon name="search" size={16} /><input aria-label="Buscar personas" className="control" value={searchValue} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, código o correo..." /></label>
            <select className="control-select status-filter" aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="todos">Todos los roles</option>{roleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
            <button className="button button-secondary" type="button" onClick={refreshPeople} disabled={loading}><Icon name="refresh" size={15} />Actualizar</button>
          </div>
          {loading ? <div className="loading-state">Consultando registros...</div> : filteredPeople.length === 0 ? <div className="empty-state">No hay personas que coincidan con la búsqueda.</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Código</th><th>Nombre completo</th><th>Rol</th><th>Grupo / Área</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{filteredPeople.map((person) => (
                  <tr key={person.id}>
                    <td><strong>{person.codigo}</strong></td>
                    <td><span className="person-cell"><span className="person-avatar">{person.nombres.charAt(0)}{person.apellidos.charAt(0)}</span><strong>{person.nombres} {person.apellidos}</strong></span></td>
                    <td>{roleLabel(person.rol)}</td>
                    <td>{person.area}</td>
                    <td><span className={`status-pill ${person.activo ? "status-active" : "status-inactive"}`}>{person.activo ? "Activo" : "Inactivo"}</span></td>
                    <td>{canWrite ? <div className="table-toolbar row-actions"><button className="button button-quiet" type="button" onClick={() => startEditing(person)} aria-label={`Editar a ${person.nombres} ${person.apellidos}`}><Icon name="edit" size={14} />Editar</button><button className="button button-quiet" type="button" onClick={() => void changeActive(person)} aria-label={`${person.activo ? "Desactivar" : "Activar"} a ${person.nombres} ${person.apellidos}`}>{person.activo ? "Desactivar" : "Activar"}</button></div> : <span className="muted small">Consulta</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="table-footnote">Mostrando {filteredPeople.length} de {personas.length} registros</div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ icon, tone, label, value, detail }: { icon: string; tone: string; label: string; value: number; detail: string }) {
  return <section className="panel metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon} /></span><span className="metric-copy"><span>{label}</span><strong>{value.toLocaleString("es-NI")}</strong><small>{detail}</small></span></section>;
}

function roleLabel(value: string) {
  return roleOptions.find((option) => option.value === value)?.label ?? "Otro";
}
