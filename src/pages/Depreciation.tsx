import { TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function DepreciationPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Afschrijvingen</h1>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <TrendingDown className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Hier komt het overzicht van afschrijvingen per jaar.
          </p>
          <p className="text-sm text-muted-foreground/70">
            Deze functie wordt binnenkort beschikbaar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
