import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { HardwareWithIncidents } from '@/hooks/useHardware'

const fmt = (v: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v)

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('nl-NL') : '—'

export function exportHardwarePdf(items: HardwareWithIncidents[], title = 'Hardware overzicht') {
  const doc = new jsPDF({ orientation: 'landscape' })

  // Title
  doc.setFontSize(16)
  doc.text(title, 14, 18)

  // Subtitle with date and count
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(
    `Geëxporteerd op ${new Date().toLocaleDateString('nl-NL')} — ${items.length} item(s)`,
    14,
    25
  )
  doc.setTextColor(0)

  // Table
  autoTable(doc, {
    startY: 30,
    head: [['Asset ID', 'Type', 'Merk', 'Serienummer', 'Locatie', 'Aanschafdatum', 'Prijs', 'Restwaarde', 'Status']],
    body: items.map((h) => [
      h.asset_id,
      h.device_type,
      h.brand ?? '—',
      h.serial_numbers?.join(', ') ?? '—',
      h.location ?? '—',
      fmtDate(h.purchase_date),
      h.price != null ? fmt(Number(h.price)) : '—',
      h.residualValue != null ? fmt(h.residualValue) : '—',
      h.device_status,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  })

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
