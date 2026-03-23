'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DURATION_LABELS } from '@coloc/shared/constants'
import type { DurationType } from '@coloc/shared/constants'

import { orpc, client } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', published: 'Publiee', archived: 'Archivee' }
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = { draft: 'outline', published: 'default', archived: 'secondary' }

export default function MyListingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: listings = [], isLoading } = useQuery(orpc.listing.mine.queryOptions())

  const deleteM = useMutation(orpc.listing.delete.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.listing.key() }) }))
  const publishM = useMutation(orpc.listing.publish.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.listing.key() }) }))
  const archiveM = useMutation(orpc.listing.archive.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.listing.key() }) }))

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes annonces</h1>
        <Link href="/listings/new"><Button>Nouvelle annonce</Button></Link>
      </div>

      {isLoading ? (
        <div className="mt-12 text-center text-muted-foreground">Chargement...</div>
      ) : listings.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">Vous n'avez pas encore d'annonces</div>
      ) : (
        <div className="mt-6 space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/listings/${listing.slug}`} className="truncate font-medium hover:underline">{listing.title}</Link>
                  <Badge variant={STATUS_VARIANTS[listing.status]}>{STATUS_LABELS[listing.status]}</Badge>
                  <Badge variant="secondary">{DURATION_LABELS[listing.durationType as DurationType]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {listing.commune}, {listing.island} · {listing.price.toLocaleString('fr-FR')} XPF/mois · {listing.views} vues
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => router.push(`/listings/${listing.slug}/edit`)}>Modifier</Button>
                {listing.status === 'draft' && <Button size="sm" variant="outline" onClick={() => publishM.mutate({ id: listing.id })}>Publier</Button>}
                {listing.status === 'published' && <Button size="sm" variant="outline" onClick={() => archiveM.mutate({ id: listing.id })}>Archiver</Button>}
                <Button size="sm" variant="destructive" onClick={() => { if (confirm('Supprimer ?')) deleteM.mutate({ id: listing.id }) }}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
