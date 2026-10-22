export function toCsv(rows: readonly (readonly unknown[])[]) {
  const escapeCell = (value: unknown) => {
    const text = String(value ?? "");
    const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };

  return `\uFEFF${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;
}
