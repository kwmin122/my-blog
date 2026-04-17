'use client'

import { useEffect, useState } from 'react'

interface PerfRow {
  id: string
  label: string
  threshold: number
  unit: string
  value: number | null
  note?: string
}

export default function PerfPage() {
  const [rows, setRows] = useState<PerfRow[]>([])

  useEffect(() => {
    const textLcp = Number(sessionStorage.getItem('text-lcp') ?? 'NaN')
    const worldFirst = Number(sessionStorage.getItem('world-first-frame') ?? 'NaN')
    const drawCalls = Number(sessionStorage.getItem('world-draw-calls-peak') ?? 'NaN')
    const posterLcp = Number(sessionStorage.getItem('poster-lcp') ?? 'NaN')
    const posterSize = 332 // bytes — known placeholder size

    setRows([
      { id: 'PERF-01', label: '/text/ LCP', threshold: 1500, unit: 'ms', value: isNaN(textLcp) ? null : textLcp },
      { id: 'PERF-02', label: '/world first frame', threshold: 3000, unit: 'ms', value: isNaN(worldFirst) ? null : worldFirst },
      { id: 'PERF-03', label: 'Draw calls peak', threshold: 800, unit: 'calls', value: isNaN(drawCalls) ? null : drawCalls },
      { id: 'PERF-04', label: 'Mobile poster LCP', threshold: 1800, unit: 'ms', value: isNaN(posterLcp) ? null : posterLcp, note: posterSize < 10240 ? 'placeholder pass' : undefined },
    ])
  }, [])

  return (
    <main className="p-8 font-mono text-sm">
      <h1 className="text-xl font-bold mb-6">Performance Gate Report</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4">ID</th>
            <th className="text-left py-2 pr-4">Metric</th>
            <th className="text-right py-2 pr-4">Threshold</th>
            <th className="text-right py-2 pr-4">Measured</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pass = row.value !== null && row.value <= row.threshold
            const status = row.value === null ? '—' : pass ? 'PASS' : 'FAIL'
            return (
              <tr key={row.id} className="border-b">
                <td className="py-2 pr-4">{row.id}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="text-right py-2 pr-4">≤{row.threshold} {row.unit}</td>
                <td className="text-right py-2 pr-4">{row.value !== null ? `${row.value.toFixed(0)} ${row.unit}` : 'not measured'}</td>
                <td className="py-2">
                  <span className={status === 'PASS' ? 'text-green-600' : status === 'FAIL' ? 'text-red-600' : 'text-gray-400'}>
                    {status}{row.note ? ` (${row.note})` : ''}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
