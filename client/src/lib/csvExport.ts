/**
 * csvExport.ts — Shared CSV export utility
 * Usage: downloadCsv(rows, columns, "filename")
 */

export interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  /** Optional formatter — receives the row and returns a display string */
  format?: (row: T) => string;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getNestedValue(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export function toCsvString<T extends Record<string, any>>(
  rows: T[],
  columns: CsvColumn<T>[]
): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((col) => {
        if (col.format) return escapeCell(col.format(row));
        return escapeCell(getNestedValue(row, col.key as string));
      })
      .join(",")
  );
  return [header, ...body].join("\n");
}

export function downloadCsv<T extends Record<string, any>>(
  rows: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  const csv = toCsvString(rows, columns);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
