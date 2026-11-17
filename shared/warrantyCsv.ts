/** Quoted RFC-style CSV with conservative spreadsheet formula neutralization. */
export function warrantyCsvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function encodeWarrantyCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(row => row.map(warrantyCsvCell).join(",")).join("\r\n") + "\r\n";
}
