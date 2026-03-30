import { jsPDF } from 'jspdf'
import type { Invoice } from '@/types/database'
import type { Hardware } from '@/types/database'

const fmt = (v: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v)

export function exportInvoicePdf(invoice: Invoice, hardware: Hardware) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // --- Afzender (linksboven) ---
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.school_name ?? 'School', 20, 25)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let y = 32
  if (invoice.school_address) { doc.text(invoice.school_address, 20, y); y += 5 }
  if (invoice.school_postal_code || invoice.school_city) {
    doc.text(`${invoice.school_postal_code ?? ''} ${invoice.school_city ?? ''}`.trim(), 20, y)
    y += 5
  }
  if (invoice.school_iban) { doc.text(`IBAN: ${invoice.school_iban}`, 20, y); y += 5 }
  if (invoice.school_kvk) { doc.text(`KvK: ${invoice.school_kvk}`, 20, y); y += 5 }

  // --- Ontvanger (rechtsboven) ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Aan:', pageWidth - 80, 25)
  doc.setFont('helvetica', 'normal')
  let ry = 32
  doc.text(invoice.parent_name, pageWidth - 80, ry); ry += 5
  if (invoice.parent_address) { doc.text(invoice.parent_address, pageWidth - 80, ry); ry += 5 }
  if (invoice.parent_postal_code || invoice.parent_city) {
    doc.text(`${invoice.parent_postal_code ?? ''} ${invoice.parent_city ?? ''}`.trim(), pageWidth - 80, ry)
    ry += 5
  }

  // --- Titel ---
  const titleY = Math.max(y, Math.max(ry, 45)) + 10
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Rekening', 20, titleY)

  // --- Datum ---
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Datum: ${new Date(invoice.created_at).toLocaleDateString('nl-NL')}`, 20, titleY + 8)
  doc.setTextColor(0)

  // --- Lijn ---
  const lineY = titleY + 14
  doc.setDrawColor(200)
  doc.line(20, lineY, pageWidth - 20, lineY)

  // --- Device info ---
  let detailY = lineY + 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Device', 20, detailY)
  doc.setFont('helvetica', 'normal')
  detailY += 7

  const details = [
    ['Asset ID', hardware.asset_id],
    ['Type', hardware.device_type],
    ['Merk', hardware.brand ?? '-'],
    ['Serienummer', hardware.serial_numbers?.join(', ') ?? '-'],
  ]
  for (const [label, value] of details) {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, 20, detailY)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 60, detailY)
    detailY += 6
  }

  // --- Omschrijving ---
  if (invoice.description) {
    detailY += 4
    doc.setFont('helvetica', 'bold')
    doc.text('Omschrijving:', 20, detailY)
    doc.setFont('helvetica', 'normal')
    detailY += 6
    doc.text(invoice.description, 20, detailY)
    detailY += 6
  }

  // --- Bedrag ---
  detailY += 8
  doc.setDrawColor(200)
  doc.line(20, detailY, pageWidth - 20, detailY)
  detailY += 10

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Te betalen:', 20, detailY)
  doc.text(fmt(invoice.total_amount), pageWidth - 20, detailY, { align: 'right' })

  // --- Betaalinstructie ---
  detailY += 12
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  if (invoice.school_iban) {
    doc.text(`Gelieve het bedrag over te maken op ${invoice.school_iban}`, 20, detailY)
    detailY += 5
    doc.text(`t.n.v. ${invoice.school_name ?? ''}`, 20, detailY)
  }

  // Save
  const filename = `rekening-${hardware.asset_id}-${invoice.parent_name.replace(/\s+/g, '-').toLowerCase()}.pdf`
  doc.save(filename)
}
