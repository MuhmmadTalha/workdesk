function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

/** Local "YYYY-MM-DD HH:mm" for a timestamp, or "" when missing. Excel reads this as a date-time. */
export function csvDateTime(value: string | null | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Today's date as YYYY-MM-DD, for file names. */
export function csvDateStamp() {
  return new Date().toISOString().split("T")[0]
}

/** Build a CSV file in the browser and download it. */
export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  // BOM so Excel opens UTF-8 names correctly.
  const csv = "﻿" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
