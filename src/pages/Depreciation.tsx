import { useState, useMemo } from 'react'
import { CalendarClock, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Hardware, HardwareType } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Given a purchase date and depreciation period (months), return the depreciation date.
 */
function getDepreciationDate(purchaseDate: string, months: number): Date {
  const d = new Date(purchaseDate)
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * Determine which school year a date falls in.
 * School year 2024-2025 runs from 1 Aug 2024 to 31 Jul 2025.
 */
function getSchoolYear(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-indexed
  // Aug (7) - Dec (11) → startYear = year
  // Jan (0) - Jul (6)  → startYear = year - 1
  const startYear = month >= 7 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

/** Sort school years descending so soonest-to-depreciate comes first */
function sortSchoolYearsDesc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

interface DepreciationDevice {
  device: Hardware
  depreciationDate: Date
  schoolYear: string
  typeName: string
  depreciationMonths: number
}

export default function DepreciationPage() {
  const [devices, setDevices] = useState<Hardware[]>([])
  const [types, setTypes] = useState<HardwareType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    const [devicesRes, typesRes] = await Promise.all([
      supabase.from('hardware').select('*').order('purchase_date', { ascending: true }),
      supabase.from('hardware_types').select('*'),
    ])
    setDevices(devicesRes.data ?? [])
    setTypes(typesRes.data ?? [])
    setLoading(false)
  }

  if (loading && devices.length === 0 && types.length === 0) {
    fetchData()
  }

  // Build a map of type name → depreciation_period (months)
  const typeMap = useMemo(() => {
    const map = new Map<string, HardwareType>()
    for (const t of types) {
      map.set(t.type, t)
    }
    return map
  }, [types])

  // Calculate depreciation info for every device with a purchase date & known type
  const depDevices: DepreciationDevice[] = useMemo(() => {
    const result: DepreciationDevice[] = []
    for (const d of devices) {
      if (!d.purchase_date) continue
      const typeInfo = typeMap.get(d.device_type)
      if (!typeInfo) continue
      const depDate = getDepreciationDate(d.purchase_date, typeInfo.depreciation_period)
      result.push({
        device: d,
        depreciationDate: depDate,
        schoolYear: getSchoolYear(depDate),
        typeName: d.device_type,
        depreciationMonths: typeInfo.depreciation_period,
      })
    }
    // Sort by depreciation date ascending (soonest first)
    result.sort((a, b) => a.depreciationDate.getTime() - b.depreciationDate.getTime())
    return result
  }, [devices, typeMap])

  // Get unique school years for filter
  const schoolYears = useMemo(() => {
    const years = [...new Set(depDevices.map((d) => d.schoolYear))]
    years.sort(sortSchoolYearsDesc)
    return years
  }, [depDevices])

  // Group by school year
  const grouped = useMemo(() => {
    const filtered = selectedYear === 'all'
      ? depDevices
      : depDevices.filter((d) => d.schoolYear === selectedYear)

    const map = new Map<string, DepreciationDevice[]>()
    for (const d of filtered) {
      const list = map.get(d.schoolYear) ?? []
      list.push(d)
      map.set(d.schoolYear, list)
    }

    const entries = [...map.entries()]
    entries.sort(([a], [b]) => sortSchoolYearsDesc(a, b))
    return entries
  }, [depDevices, selectedYear])

  // Auto-expand all years initially
  const effectiveExpanded = useMemo(() => {
    if (expandedYears.size > 0) return expandedYears
    return new Set(grouped.map(([year]) => year))
  }, [expandedYears, grouped])

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      // Initialize from current effective set
      const next = new Set(prev.size > 0 ? prev : grouped.map(([y]) => y))
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const isDepreciated = (d: DepreciationDevice) => d.depreciationDate <= new Date()

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Afschrijvingen</h1>
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  const devicesWithoutDate = devices.filter((d) => !d.purchase_date).length
  const devicesWithoutType = devices.filter(
    (d) => d.purchase_date && !typeMap.has(d.device_type)
  ).length

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Afschrijvingen</h1>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">Alle schooljaren</option>
            {schoolYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {(devicesWithoutDate > 0 || devicesWithoutType > 0) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {devicesWithoutDate > 0 && (
            <p>{devicesWithoutDate} device(s) zonder aanschafdatum — deze worden niet getoond.</p>
          )}
          {devicesWithoutType > 0 && (
            <p>{devicesWithoutType} device(s) met onbekend type — stel afschrijvingsperiode in bij Instellingen.</p>
          )}
        </div>
      )}

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Geen afschrijvingen gevonden.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([year, items]) => (
            <div key={year}>
              <button
                onClick={() => toggleYear(year)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/50"
              >
                {effectiveExpanded.has(year) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <h2 className="text-base font-semibold">Schooljaar {year}</h2>
                <span className="ml-auto text-sm text-muted-foreground">
                  {items.length} device{items.length !== 1 ? 's' : ''}
                </span>
              </button>

              {effectiveExpanded.has(year) && (
                <div className="mt-1 overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                        <th className="w-3 p-0" />
                        <th className="px-3 py-2 text-left font-medium">Asset ID</th>
                        <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Type</th>
                        <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Merk</th>
                        <th className="px-3 py-2 text-left font-medium">Aangeschaft</th>
                        <th className="px-3 py-2 text-left font-medium">Afgeschreven</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const deprecated = isDepreciated(item)
                        return (
                          <tr key={item.device.id} className="border-b last:border-b-0 hover:bg-muted/20">
                            <td className={`w-1 p-0 ${deprecated ? 'bg-red-400' : 'bg-green-400'}`} />
                            <td className="px-3 py-1.5 font-medium">{item.device.asset_id}</td>
                            <td className="hidden px-3 py-1.5 sm:table-cell">{item.typeName}</td>
                            <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{item.device.brand ?? '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {new Date(item.device.purchase_date!).toLocaleDateString('nl-NL', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                              })}
                            </td>
                            <td className="px-3 py-1.5 font-medium">{formatDate(item.depreciationDate)}</td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  deprecated ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {deprecated ? 'Afgeschreven' : 'Lopend'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {depDevices.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3">
          <h3 className="mb-2 text-sm font-medium">Samenvatting</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Totaal</p>
              <p className="text-lg font-semibold">{depDevices.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Afgeschreven</p>
              <p className="text-lg font-semibold text-red-600">
                {depDevices.filter(isDepreciated).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Lopend</p>
              <p className="text-lg font-semibold text-green-600">
                {depDevices.filter((d) => !isDepreciated(d)).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Schooljaren</p>
              <p className="text-lg font-semibold">{schoolYears.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
