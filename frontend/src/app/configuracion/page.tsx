"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import AppShell, { Icon } from "@/components/AppShell";
import { useSGAAccess } from "@/lib/access";
import { apiFetch } from "@/lib/api";

type Role = { name: string; description: string };
type Person = { id: number; codigo: string; nombres: string; apellidos: string; activo: boolean; usuario: number | null };
type Account = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: string;
  persona_id: number | null;
  persona_nombre: string;
  persona_codigo: string;
  last_login: string | null;
  date_joined: string;
};
type AccountForm = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  persona_id: string;
  password: string;
  is_active: boolean;
};

const emptyForm: AccountForm = { username: "", email: "", first_name: "", last_name: "", role: "", persona_id: "", password: "", is_active: true };

function errorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Revisa los datos e inténtalo nuevamente.";
  const value = payload as Record<string, unknown>;
  if (typeof value.detail === "string") return value.detail;
  const messages = Object.entries(value).flatMap(([field, errors]) => {
    const detail = Array.isArray(errors) ? errors.join(" ") : typeof errors === "string" ? errors : "";
    return detail ? [`${field}: ${detail}`] : [];
  });
  return messages.join(" · ") || "Revisa los datos e inténtalo nuevamente.";
}

export default function ConfigurationPage() {
  const { user } = useSGAAccess();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [editing, setEditing] = useState<Account | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      const [accountResponse, roleResponse, peopleResponse] = await Promise.all([
        apiFetch("/api/configuracion/usuarios/"),
        apiFetch("/api/configuracion/roles/"),
        apiFetch("/api/configuracion/personas/"),
      ]);
      const [accountPayload, rolePayload, peoplePayload] = await Promise.all([
        accountResponse.json().catch(() => []),
        roleResponse.json().catch(() => []),
        peopleResponse.json().catch(() => []),
      ]);
      const responses = [accountResponse, roleResponse, peopleResponse];
      const payloads = [accountPayload, rolePayload, peoplePayload];
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) throw new Error(errorMessage(payloads[failedIndex]));
      setAccounts(accountPayload);
      setRoles(rolePayload);
      setPeople(peoplePayload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración del sistema.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadConfiguration); }, [loadConfiguration]);

  const isEmployeeRole = form.role === "Empleado / Estudiante";
  const isEditingSelf = Boolean(editing && user?.id === editing.id);
  const linkedPersonIds = useMemo(() => new Set(accounts.filter((account) => account.id !== editing?.id && account.persona_id).map((account) => account.persona_id as number)), [accounts, editing]);
  const availablePeople = useMemo(() => people.filter((person) => person.activo && (!linkedPersonIds.has(person.id) || person.id === editing?.persona_id)), [people, linkedPersonIds, editing]);
  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) => `${account.username} ${account.email} ${account.first_name} ${account.last_name} ${account.role} ${account.persona_nombre}`.toLocaleLowerCase().includes(query));
  }, [accounts, search]);

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, role: roles[0]?.name ?? "" });
    setError("");
  }

  function startEditing(account: Account) {
    setEditing(account);
    setForm({
      username: account.username,
      email: account.email,
      first_name: account.first_name,
      last_name: account.last_name,
      role: account.role,
      persona_id: account.persona_id ? String(account.persona_id) : "",
      password: "",
      is_active: account.is_active,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const body: Record<string, string | number | boolean | null> = {
      username: form.username.trim(),
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      role: form.role,
      persona_id: isEmployeeRole && form.persona_id ? Number(form.persona_id) : null,
      is_active: form.is_active,
    };
    if (form.password) body.password = form.password;
    try {
      const response = await apiFetch(editing ? `/api/configuracion/usuarios/${editing.id}/` : "/api/configuracion/usuarios/", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload));
      setMessage(editing ? "La cuenta se actualizó correctamente." : "La cuenta se creó correctamente.");
      setEditing(null);
      setForm({ ...emptyForm, role: roles[0]?.name ?? "" });
      await loadConfiguration();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la cuenta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Configuración" subtitle="Administra las cuentas, sus roles y la vinculación personal">
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="configuration-layout">
        <section className="panel panel-pad">
          <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="settings" size={17} /></span><div><h2>{editing ? "Editar cuenta" : "Crear cuenta"}</h2><p>Las contraseñas deben tener al menos 12 caracteres.</p></div></div></div>
          <form className="form-fields" onSubmit={saveAccount}>
            <label className="field-label">Usuario institucional *<input className="control" required maxLength={150} autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
            <label className="field-label">Correo electrónico<input className="control" type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <div className="form-row">
              <label className="field-label">Nombres<input className="control" maxLength={150} value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label>
              <label className="field-label">Apellidos<input className="control" maxLength={150} value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label>
            </div>
            <label className="field-label">Rol de acceso *<select className="control-select" required value={form.role} disabled={isEditingSelf} onChange={(event) => setForm({ ...form, role: event.target.value, persona_id: "" })}><option value="">Selecciona un rol</option>{roles.map((role) => <option value={role.name} key={role.name}>{role.name}</option>)}</select></label>
            {isEmployeeRole && <label className="field-label">Ficha personal vinculada *<select className="control-select" required value={form.persona_id} onChange={(event) => setForm({ ...form, persona_id: event.target.value })}><option value="">Selecciona una persona activa</option>{availablePeople.map((person) => <option value={person.id} key={person.id}>{person.codigo} · {person.nombres} {person.apellidos}</option>)}</select><small className="muted">El empleado solo podrá consultar sus propios registros.</small></label>}
            <label className="field-label">{editing ? "Nueva contraseña (opcional)" : "Contraseña inicial *"}<input className="control" type="password" required={!editing} minLength={12} autoComplete={editing ? "new-password" : "new-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? "Déjala vacía para conservarla" : "Mínimo 12 caracteres"} /></label>
            <label className="active-toggle"><input type="checkbox" checked={form.is_active} disabled={isEditingSelf} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span><strong>Cuenta activa</strong><small>Una cuenta inactiva no puede iniciar sesión.</small></span></label>
            <div className="table-toolbar"><button className="button button-primary" type="submit" disabled={saving || loading}><Icon name={editing ? "file" : "plus"} size={16} />{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear cuenta"}</button>{editing && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar</button>}</div>
          </form>
        </section>

        <div className="configuration-main">
          <section className="panel panel-pad role-catalog">
            <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="people" size={17} /></span><div><h2>Roles del sistema</h2><p>Permisos aplicados en el servidor</p></div></div></div>
            <div className="role-card-grid">{roles.map((role) => <article className="role-card" key={role.name}><strong>{role.name}</strong><p>{role.description}</p></article>)}</div>
          </section>

          <section className="panel panel-pad">
            <div className="panel-heading"><div className="panel-title"><span className="panel-title-icon"><Icon name="settings" size={17} /></span><div><h2>Cuentas de usuario</h2><p>{accounts.length} cuentas administrables</p></div></div><button className="button button-secondary" type="button" onClick={() => void loadConfiguration()} disabled={loading}><Icon name="refresh" size={15} />Actualizar</button></div>
            <div className="table-toolbar account-toolbar"><label className="search-control"><Icon name="search" size={16} /><input className="control" aria-label="Buscar cuentas" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario, correo, rol o persona..." /></label></div>
            {loading ? <div className="loading-state">Cargando configuración...</div> : filteredAccounts.length === 0 ? <div className="empty-state">No se encontraron cuentas.</div> : <div className="table-wrap"><table className="data-table account-table">
              <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Ficha personal</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>{filteredAccounts.map((account) => <tr key={account.id}>
                <td><strong>{account.username}</strong>{(account.first_name || account.last_name) && <small className="account-name">{account.first_name} {account.last_name}</small>}</td>
                <td>{account.email || <span className="muted">—</span>}</td>
                <td>{account.role || <span className="muted">Sin rol</span>}</td>
                <td>{account.persona_nombre ? <><strong>{account.persona_codigo}</strong><small className="account-name">{account.persona_nombre}</small></> : <span className="muted">No aplica</span>}</td>
                <td><span className={`status-pill ${account.is_active ? "status-active" : "status-inactive"}`}>{account.is_active ? "Activa" : "Inactiva"}</span></td>
                <td><button className="button button-quiet" type="button" onClick={() => startEditing(account)}><Icon name="edit" size={14} />Editar</button></td>
              </tr>)}</tbody>
            </table></div>}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
