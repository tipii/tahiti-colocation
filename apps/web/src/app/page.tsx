'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ISLANDS, DURATION_TYPES, DURATION_LABELS } from '@coloc/shared/constants'

import { orpc } from '@/lib/orpc'
import { ListingCard } from '@/components/listing-card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const input = {
    page,
    ...(selectedIsland ? { island: selectedIsland as any } : {}),
    ...(selectedDuration ? { durationType: selectedDuration as any } : {}),
  }

  const { data, isLoading } = useQuery(orpc.listing.list.queryOptions({ input }))

  const listings = data?.data ?? []
  const meta = data?.meta

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-bold">Annonces</h1>
      <p className="mt-1 text-muted-foreground">Trouvez votre colocation ideale en Polynesie</p>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={!selectedIsland ? 'default' : 'outline'} onClick={() => { setSelectedIsland(null); setPage(1) }}>
            Toutes les iles
          </Button>
          {ISLANDS.filter((i) => i !== 'Other').map((island) => (
            <Button key={island} size="sm" variant={selectedIsland === island ? 'default' : 'outline'} onClick={() => { setSelectedIsland(selectedIsland === island ? null : island); setPage(1) }}>
              {island}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DURATION_TYPES.map((dt) => (
            <Button key={dt} size="sm" variant={selectedDuration === dt ? 'default' : 'outline'} onClick={() => { setSelectedDuration(selectedDuration === dt ? null : dt); setPage(1) }}>
              {DURATION_LABELS[dt]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-12 text-center text-muted-foreground">Chargement...</div>
      ) : listings.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">Aucune annonce pour le moment</div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing as any} />
            ))}
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Precedent</Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">{page} / {meta.totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Suivant</Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
