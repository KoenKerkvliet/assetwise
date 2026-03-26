import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Hardware } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEVICE_STATUSES = ['active', 'in_repair', 'inactive', 'retired']

export default function HardwareDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Hardware | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('hardware')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setItem(data)
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!item) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase
      .from('hardware')
      .update({
        asset_id: item.asset_id,
        serial_numbers: item.serial_numbers,
        device_type: item.device_type,
        brand: item.brand,
        device_status: item.device_status,
        location: item.location,
        purchase_date: item.purchase_date,
        school_year: item.school_year,
        price: item.price,
        notes: item.notes,
      })
      .eq('id', item.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
    setSaving(false)
  }

  const update = (field: keyof Hardware, value: unknown) => {
    setItem(prev => prev ? { ...prev, [field]: value } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error && !item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/hardware')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Terug
        </Button>
        <p className="text-destructive">Fout: {error}</p>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/hardware')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Terug naar overzicht
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {item.asset_id} bewerken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="asset_id">Asset ID</Label>
                <Input
                  id="asset_id"
                  value={item.asset_id}
                  onChange={(e) => update('asset_id', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial">Serienummer(s)</Label>
                <Input
                  id="serial"
                  value={item.serial_numbers?.join(', ') ?? ''}
                  onChange={(e) => update('serial_numbers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={item.device_type}
                  onChange={(e) => update('device_type', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Merk</Label>
                <Input
                  id="brand"
                  value={item.brand ?? ''}
                  onChange={(e) => update('brand', e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={item.device_status}
                  onValueChange={(v) => update('device_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Locatie</Label>
                <Input
                  id="location"
                  value={item.location ?? ''}
                  onChange={(e) => update('location', e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_date">Aanschafdatum</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={item.purchase_date ?? ''}
                  onChange={(e) => update('purchase_date', e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school_year">Schooljaar</Label>
                <Input
                  id="school_year"
                  value={item.school_year ?? ''}
                  onChange={(e) => update('school_year', e.target.value || null)}
                  placeholder="bijv. 2024-2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Prijs</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={item.price ?? ''}
                  onChange={(e) => update('price', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={item.notes ?? ''}
                onChange={(e) => update('notes', e.target.value || null)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">Opgeslagen!</p>}

            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
