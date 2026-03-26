import { useEffect, useState } from 'react'
import { Monitor, AlertTriangle, CheckCircle, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface Stats {
  total: number
  active: number
  repair: number
  inactive: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, repair: 0, inactive: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase
        .from('hardware')
        .select('device_status')

      if (!error && data) {
        const total = data.length
        const active = data.filter(h => h.device_status === 'active' || h.device_status === 'actief').length
        const repair = data.filter(h => h.device_status === 'in_repair' || h.device_status === 'in reparatie').length
        const inactive = total - active - repair
        setStats({ total, active, repair, inactive })
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  const cards = [
    { title: 'Totaal Hardware', value: stats.total, icon: Monitor, color: 'text-blue-600' },
    { title: 'Actief', value: stats.active, icon: CheckCircle, color: 'text-green-600' },
    { title: 'In Reparatie', value: stats.repair, icon: Wrench, color: 'text-orange-600' },
    { title: 'Inactief', value: stats.inactive, icon: AlertTriangle, color: 'text-muted-foreground' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
