import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, CheckCircle, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Hardware, Invoice } from '@/types/database'
import { exportInvoicePdf } from '@/lib/exportInvoicePdf'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface InvoiceWithDevice extends Invoice {
  hardware?: Hardware
}

const fmt = (v: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<InvoiceWithDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    const [invoicesRes, hwRes] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('hardware').select('*'),
    ])

    const hwMap = new Map<string, Hardware>()
    for (const hw of hwRes.data ?? []) {
      hwMap.set(hw.id, hw)
    }

    const enriched: InvoiceWithDevice[] = (invoicesRes.data ?? []).map((inv) => ({
      ...inv,
      hardware: hwMap.get(inv.hardware_id),
    }))

    setInvoices(enriched)
    setLoading(false)
  }

  if (loading && invoices.length === 0) {
    fetchData()
  }

  const filtered = useMemo(() => {
    if (!search) return invoices
    const q = search.toLowerCase()
    return invoices.filter((inv) =>
      inv.parent_name.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.description?.toLowerCase().includes(q) ||
      inv.hardware?.asset_id.toLowerCase().includes(q) ||
      inv.hardware?.device_type.toLowerCase().includes(q) ||
      inv.hardware?.serial_numbers?.some(s => s.toLowerCase().includes(q))
    )
  }, [invoices, search])

  const openInvoices = filtered.filter(inv => inv.status !== 'betaald')
  const paidInvoices = filtered.filter(inv => inv.status === 'betaald')
  const openTotal = openInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0)

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'betaald' })
      .eq('id', id)

    if (error) {
      alert('Kon status niet bijwerken: ' + error.message)
    } else {
      setInvoices(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: 'betaald' } : inv
      ))
    }
  }

  const markAsOpen = async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'openstaand' })
      .eq('id', id)

    if (error) {
      alert('Kon status niet bijwerken: ' + error.message)
    } else {
      setInvoices(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: 'openstaand' } : inv
      ))
    }
  }

  const handleDownloadPdf = (inv: InvoiceWithDevice) => {
    if (inv.hardware) {
      exportInvoicePdf(inv, inv.hardware)
    }
  }

  const renderTable = (items: InvoiceWithDevice[], isPaid: boolean) => (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Factuurnr.</th>
            <th className="px-3 py-2 text-left font-medium">Ontvanger</th>
            <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Device</th>
            <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Serienummer</th>
            <th className="px-3 py-2 text-right font-medium">Bedrag</th>
            <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Datum</th>
            <th className="w-24 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((inv) => (
            <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/20">
              <td className="px-3 py-2 font-mono text-xs">{inv.invoice_number ?? '—'}</td>
              <td className="px-3 py-2">
                <p className="font-medium">{inv.parent_name}</p>
                <p className="text-xs text-muted-foreground sm:hidden">
                  {inv.hardware?.device_type} · {formatDate(inv.created_at)}
                </p>
              </td>
              <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                {inv.hardware?.device_type ?? '—'}
              </td>
              <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                {inv.hardware?.serial_numbers?.join(', ') ?? '—'}
              </td>
              <td className="px-3 py-2 text-right font-medium">{fmt(inv.total_amount)}</td>
              <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                {formatDate(inv.created_at)}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="PDF downloaden"
                    onClick={() => handleDownloadPdf(inv)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {isPaid ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => markAsOpen(inv.id)}
                    >
                      Heropenen
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-green-600"
                      onClick={() => markAsPaid(inv.id)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" /> Betaald
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Rekeningen</h1>
        {openInvoices.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <FileText className="h-3 w-3" />
            {openInvoices.length} openstaand · {fmt(openTotal)}
          </span>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoeken op naam, factuurnr., serienummer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Laden...</p>
      ) : invoices.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Geen rekeningen aangemaakt.</p>
      ) : (
        <>
          {/* Openstaande rekeningen */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Openstaand ({openInvoices.length})
            </h2>
            {openInvoices.length === 0 ? (
              <p className="rounded-md border py-6 text-center text-sm text-muted-foreground">
                Geen openstaande rekeningen.
              </p>
            ) : (
              renderTable(openInvoices, false)
            )}
          </div>

          {/* Betaalde rekeningen */}
          {paidInvoices.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Betaald ({paidInvoices.length})
              </h2>
              {renderTable(paidInvoices, true)}
            </div>
          )}
        </>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} rekening(en)</p>
    </div>
  )
}
