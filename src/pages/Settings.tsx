import { useState, type FormEvent } from 'react'
import { Save, Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { HardwareType, DepreciationRate } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function GeneralSettings() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.user_metadata?.full_name ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    })

    setMessage(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Naam opgeslagen!' }
    )
    setSaving(false)
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Wachtwoorden komen niet overeen.' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Wachtwoord moet minimaal 6 tekens zijn.' })
      return
    }

    setSaving(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    setMessage(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Wachtwoord gewijzigd!' }
    )
    setPassword('')
    setConfirmPassword('')
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Naam</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Volledige naam</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving} size="sm">
              <Save className="mr-2 h-4 w-4" />Opslaan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wachtwoord wijzigen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pw">Nieuw wachtwoord</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Bevestig wachtwoord</Label>
                <Input id="pw2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={saving} size="sm">
              <Save className="mr-2 h-4 w-4" />Wachtwoord wijzigen
            </Button>
          </form>
        </CardContent>
      </Card>

      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}

/** Convert total months to { years, months } */
function monthsToYM(total: number) {
  return { years: Math.floor(total / 12), months: total % 12 }
}

/** Convert { years, months } to total months */
function ymToMonths(years: number, months: number) {
  return years * 12 + months
}

function DepreciationInput({
  label,
  totalMonths,
  onChange,
}: {
  label: string
  totalMonths: number
  onChange: (months: number) => void
}) {
  const { years, months } = monthsToYM(totalMonths)

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="relative">
            <Input
              type="number"
              min={0}
              value={years}
              onChange={(e) => onChange(ymToMonths(parseInt(e.target.value) || 0, months))}
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              jaar
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={11}
              value={months}
              onChange={(e) => onChange(ymToMonths(years, parseInt(e.target.value) || 0))}
              className="pr-12"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              mnd
            </span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">{totalMonths} maanden totaal</p>
    </div>
  )
}

function DeviceTypesSettings() {
  const { user } = useAuth()
  const [types, setTypes] = useState<HardwareType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ type: '', depreciation_period: 0, warranty_period: 0 })
  const [newForm, setNewForm] = useState({ type: '', depreciation_period: 60, warranty_period: 24 })
  const [showNew, setShowNew] = useState(false)

  const fetchTypes = async () => {
    const { data } = await supabase
      .from('hardware_types')
      .select('*')
      .order('type')
    setTypes(data ?? [])
    setLoading(false)
  }

  if (loading && types.length === 0) {
    fetchTypes()
  }

  const startEdit = (t: HardwareType) => {
    setEditingId(t.id)
    setEditForm({
      type: t.type,
      depreciation_period: t.depreciation_period,
      warranty_period: t.warranty_period ?? 0,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await supabase
      .from('hardware_types')
      .update({
        type: editForm.type,
        depreciation_period: editForm.depreciation_period,
        warranty_period: editForm.warranty_period || null,
      })
      .eq('id', editingId)
    setEditingId(null)
    fetchTypes()
  }

  const deleteType = async (id: string) => {
    await supabase.from('hardware_types').delete().eq('id', id)
    fetchTypes()
  }

  const addType = async (e: FormEvent) => {
    e.preventDefault()
    if (!newForm.type.trim()) return
    await supabase.from('hardware_types').insert({
      type: newForm.type.trim(),
      depreciation_period: newForm.depreciation_period,
      warranty_period: newForm.warranty_period || null,
      user_id: user!.id,
    })
    setNewForm({ type: '', depreciation_period: 60, warranty_period: 24 })
    setShowNew(false)
    fetchTypes()
  }

  const formatPeriod = (months: number) => {
    const y = Math.floor(months / 12)
    const m = months % 12
    if (y > 0 && m > 0) return `${y} jaar, ${m} mnd`
    if (y > 0) return `${y} jaar`
    return `${m} mnd`
  }

  if (loading) return <p className="text-muted-foreground">Laden...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{types.length} device type(s)</h3>
        <Button size="sm" variant="outline" onClick={() => setShowNew(!showNew)}>
          <Plus className="mr-2 h-4 w-4" />{showNew ? 'Annuleren' : 'Nieuw type'}
        </Button>
      </div>

      {showNew && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={addType} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Naam</Label>
                <Input value={newForm.type} onChange={(e) => setNewForm({ ...newForm, type: e.target.value })} placeholder="bijv. Laptop" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DepreciationInput
                  label="Afschrijvingsperiode"
                  totalMonths={newForm.depreciation_period}
                  onChange={(v) => setNewForm({ ...newForm, depreciation_period: v })}
                />
                <DepreciationInput
                  label="Garantieperiode"
                  totalMonths={newForm.warranty_period}
                  onChange={(v) => setNewForm({ ...newForm, warranty_period: v })}
                />
              </div>
              <Button type="submit" size="sm"><Plus className="mr-2 h-4 w-4" />Toevoegen</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {types.map((t) => (
          <Card key={t.id} className="p-3">
            <CardContent className="p-0">
              {editingId === t.id ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Naam</Label>
                    <Input value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DepreciationInput
                      label="Afschrijvingsperiode"
                      totalMonths={editForm.depreciation_period}
                      onChange={(v) => setEditForm({ ...editForm, depreciation_period: v })}
                    />
                    <DepreciationInput
                      label="Garantieperiode"
                      totalMonths={editForm.warranty_period}
                      onChange={(v) => setEditForm({ ...editForm, warranty_period: v })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={saveEdit}><Check className="mr-1 h-4 w-4" />Opslaan</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-1 h-4 w-4" />Annuleren</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.type}</p>
                    <p className="text-xs text-muted-foreground">
                      Afschrijving: {formatPeriod(t.depreciation_period)}
                      {t.warranty_period ? ` · Garantie: ${formatPeriod(t.warranty_period)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteType(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function RecoveryRateSettings() {
  const { user } = useAuth()
  const [rates, setRates] = useState<DepreciationRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchRates = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('depreciation_rates')
      .eq('user_id', user!.id)
      .single()

    const stored = data?.depreciation_rates as DepreciationRate[] | null
    setRates(stored ?? [
      { from_months: 0, to_months: 12, percentage: 100 },
      { from_months: 12, to_months: 24, percentage: 75 },
      { from_months: 24, to_months: 36, percentage: 50 },
      { from_months: 36, to_months: null, percentage: 0 },
    ])
    setLoading(false)
  }

  if (loading && rates.length === 0) {
    fetchRates()
  }

  const addRow = () => {
    const last = rates[rates.length - 1]
    const startMonth = last ? (last.to_months ?? last.from_months + 12) : 0
    setRates([...rates, { from_months: startMonth, to_months: startMonth + 12, percentage: 0 }])
  }

  const removeRow = (idx: number) => {
    setRates(rates.filter((_, i) => i !== idx))
  }

  const updateRow = (idx: number, field: keyof DepreciationRate, value: number | null) => {
    setRates(rates.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    // Validate: percentages between 0-100, periods don't overlap
    for (const r of rates) {
      if (r.percentage < 0 || r.percentage > 100) {
        setMessage({ type: 'error', text: 'Percentage moet tussen 0 en 100 liggen.' })
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ depreciation_rates: rates })
      .eq('user_id', user!.id)

    setMessage(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Terugvorderingspercentages opgeslagen!' }
    )
    setSaving(false)
  }

  const formatMonths = (m: number) => {
    const y = Math.floor(m / 12)
    const rest = m % 12
    if (y > 0 && rest > 0) return `${y}j ${rest}m`
    if (y > 0) return `${y} jaar`
    return `${m} mnd`
  }

  if (loading) return <p className="text-muted-foreground">Laden...</p>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terugvorderingspercentages</CardTitle>
          <p className="text-xs text-muted-foreground">
            Stel in welk percentage van de aankoopprijs teruggevorderd kan worden op basis van de periode na aanschaf.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Van (maanden)</th>
                  <th className="px-3 py-2 text-left font-medium">Tot (maanden)</th>
                  <th className="px-3 py-2 text-left font-medium">Percentage</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-20"
                          value={rate.from_months}
                          onChange={(e) => updateRow(idx, 'from_months', parseInt(e.target.value) || 0)}
                        />
                        <span className="text-xs text-muted-foreground">{formatMonths(rate.from_months)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-20"
                          value={rate.to_months ?? ''}
                          placeholder="∞"
                          onChange={(e) => {
                            const v = e.target.value
                            updateRow(idx, 'to_months', v === '' ? null : parseInt(v) || 0)
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {rate.to_months != null ? formatMonths(rate.to_months) : '∞'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="relative w-24">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-8 pr-7"
                          value={rate.percentage}
                          onChange={(e) => updateRow(idx, 'percentage', parseInt(e.target.value) || 0)}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeRow(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />Periode toevoegen
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
              {message.text}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Instellingen</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Algemeen</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="recovery">Terugvordering</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="devices" className="mt-4">
          <DeviceTypesSettings />
        </TabsContent>
        <TabsContent value="recovery" className="mt-4">
          <RecoveryRateSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
