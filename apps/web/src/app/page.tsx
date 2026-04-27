'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LISTING_TYPES, LISTING_TYPE_LABELS, DEFAULT_COUNTRY } from '@coloc/shared/constants'

import { orpc } from '@/lib/orpc'
import { ListingCard } from '@/components/listing-card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const input = {
    page,
    ...(selectedRegion ? { region: selectedRegion as any } : {}),
    ...(selectedDuration ? { listingType: selectedDuration as any } : {}),
  }

  const { data, isLoading } = useQuery(orpc.listing.list.queryOptions({ input }))
  const { data: regions = [] } = useQuery(orpc.geo.regions.queryOptions({
    input: { country: DEFAULT_COUNTRY },
    staleTime: 60 * 60 * 1000,
  }))

  const listings = data?.data ?? []
  const meta = data?.meta

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-bold">Annonces</h1>
      <p className="mt-1 text-muted-foreground">Trouvez votre colocation ideale en Polynesie</p>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={!selectedRegion ? 'default' : 'outline'} onClick={() => { setSelectedRegion(null); setPage(1) }}>
            Toutes les iles
          </Button>
          {regions.filter((r) => r.code !== 'Other').map((r) => (
            <Button key={r.code} size="sm" variant={selectedRegion === r.code ? 'default' : 'outline'} onClick={() => { setSelectedRegion(selectedRegion === r.code ? null : r.code); setPage(1) }}>
              {r.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {LISTING_TYPES.map((dt) => (
            <Button key={dt} size="sm" variant={selectedDuration === dt ? 'default' : 'outline'} onClick={() => { setSelectedDuration(selectedDuration === dt ? null : dt); setPage(1) }}>
              {LISTING_TYPE_LABELS[dt]}
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
