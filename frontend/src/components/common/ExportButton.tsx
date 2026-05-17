import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  columns?: { key: string; header: string }[]
}

function convertToCSV(
  data: Record<string, unknown>[],
  columns?: { key: string; header: string }[]
): string {
  if (data.length === 0) return ''

  const cols = columns || Object.keys(data[0]).map((key) => ({ key, header: key }))
  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility

  const header = cols.map((c) => `"${c.header}"`).join(';')
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key]
        if (val === null || val === undefined) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      })
      .join(';')
  )

  return BOM + [header, ...rows].join('\r\n')
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    if (data.length === 0) return
    setIsExporting(true)

    try {
      const csv = convertToCSV(data, columns)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0 || isExporting}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      title="Экспорт в CSV"
    >
      <FileSpreadsheet className="h-4 w-4" />
      <span className="hidden sm:inline">Экспорт</span>
      <Download className="h-3 w-3" />
    </button>
  )
}
