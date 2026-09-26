"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Persona = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [personas, setPersonas] = useState<Persona[]>([]);

  const [codigo, setCodigo] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [activo, setActivo] = useState(true);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargarPersonas = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(`${API_URL}/api/personas/`);

      if (!respuesta.ok) {
        throw new Error("No se pudieron obtener las personas.");
      }

      const datos: Persona[] = await respuesta.json();

      setPersonas(datos);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al consultar el backend.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPersonas();
  }, [cargarPersonas]);

  async function registrarPersona(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    try {
      setGuardando(true);
      setMensaje("");
      setError("");

      const respuesta = await fetch(
        `${API_URL}/api/personas/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            codigo,
            nombres,
            apellidos,
            activo,
          }),
        }
      );

      if (!respuesta.ok) {
        const detalle = await respuesta.json();

        if (detalle.codigo) {
          throw new Error(
            "El código ingresado ya se encuentra registrado."
          );
        }

        throw new Error(
          "No fue posible registrar la persona."
        );
      }

      setCodigo("");
      setNombres("");
      setApellidos("");
      setActivo(true);

      setMensaje("Persona registrada correctamente.");

      await cargarPersonas();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Ocurrió un error al registrar la persona."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-2xl font-bold">
            Sistema de Gestión de Asistencia
          </h1>

          <p className="mt-1 text-sm text-slate-300">
            Gestión de personas
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-3">

        {/* FORMULARIO */}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-800">
            Registrar persona
          </h2>

          <form
            onSubmit={registrarPersona}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Código
              </label>

              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
                maxLength={30}
                placeholder="Ej. P002"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombres
              </label>

              <input
                type="text"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                required
                maxLength={100}
                placeholder="Nombres"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Apellidos
              </label>

              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                required
                maxLength={100}
                placeholder="Apellidos"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-600"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />

              Persona activa
            </label>

            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando
                ? "Guardando..."
                : "Registrar persona"}
            </button>
          </form>

          {mensaje && (
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {mensaje}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        {/* LISTADO */}

        <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">
                Personas registradas
              </h2>

              <p className="text-sm text-slate-500">
                Información obtenida mediante la API REST
                del SGA.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarPersonas}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>

          {cargando ? (
            <p className="text-slate-500">
              Consultando API...
            </p>
          ) : personas.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-slate-500">
              No existen personas registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-3 py-3">
                      Código
                    </th>

                    <th className="px-3 py-3">
                      Nombres
                    </th>

                    <th className="px-3 py-3">
                      Apellidos
                    </th>

                    <th className="px-3 py-3">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {personas.map((persona) => (
                    <tr
                      key={persona.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-4 font-medium text-slate-900">
                        {persona.codigo}
                      </td>

                      <td className="px-3 py-4 text-slate-700">
                        {persona.nombres}
                      </td>

                      <td className="px-3 py-4 text-slate-700">
                        {persona.apellidos}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            persona.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {persona.activo
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}