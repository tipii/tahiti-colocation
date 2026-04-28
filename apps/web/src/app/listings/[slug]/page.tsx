'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LISTING_TYPE_LABELS, ROOM_TYPE_LABELS, HOUSING_TYPE_LABELS } from '@coloc/shared/constants'
import type { ListingType, RoomType, HousingType } from '@coloc/shared/constants'

import { authClient } from '@/lib/auth-client'
import { orpc } from '@/lib/orpc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const { data: listing, isLoading } = useQuery(
    orpc.listing.get.queryOptions({ input: { idOrSlug: slug } }),
  )

  const { data: amenityCatalog = [] } = useQuery(orpc.meta.amenities.queryOptions({
    staleTime: 60 * 60 * 1000,
  }))

  const deleteM = useMutation(orpc.listing.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
      router.push('/')
    },
  }))

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Chargement...</div>
  if (!listing) return <div className="py-20 text-center text-muted-foreground">Annonce introuvable</div>

  const isOwner = session?.user?.id === listing.authorId
  const images = listing.images ?? []

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      {images.length > 0 ? (
        <div className="grid gap-2 overflow-hidden rounded-lg" style={{ gridTemplateColumns: images.length === 1 ? '1fr' : '2fr 1fr' }}>
          <img src={images[0].mediumUrl ?? ''} alt="" className="h-80 w-full rounded-lg object-cover" />
          {images.length > 1 && (
            <div className="flex flex-col gap-2">
              {images.slice(1, 3).map((img) => (
                <img key={img.id} src={img.mediumUrl ?? ''} alt="" className="h-[calc(50%-4px)] w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-64 rounded-lg bg-muted" />
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge>{LISTING_TYPE_LABELS[listing.listingType as ListingType]}</Badge>
              <Badge variant="secondary">{HOUSING_TYPE_LABELS[listing.housingType as HousingType]}</Badge>
              {listing.status === 'draft' && <Badge variant="outline">Brouillon</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-bold">{listing.title}</h1>
            <p className="mt-1 text-muted-foreground">{listing.cityLabel ?? listing.city}, {listing.regionLabel ?? listing.region}</p>
          </div>

          <Separator />

          <div>
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Logement</h2>
            <p className="mt-1">
              {ROOM_TYPE_LABELS[listing.roomType as RoomType]} · Coloc avec {listing.roommateCount} {listing.roommateCount > 1 ? 'personnes' : 'personne'}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Disponibilite</h2>
            <p className="mt-1">
              A partir du {new Date(listing.availableFrom).toLocaleDateString('fr-FR')}
              {listing.availableTo && ` jusqu'au ${new Date(listing.availableTo).toLocaleDateString('fr-FR')}`}
            </p>
          </div>

          {(listing.amenities ?? []).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">Equipements</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {amenityCatalog
                  .filter((a) => (listing.amenities ?? []).includes(a.code))
                  .map((a) => (
                    <Badge key={a.code} variant="secondary">{a.label}</Badge>
                  ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Description</h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-5">
            <p className="text-2xl font-bold">{listing.price.toLocaleString('fr-FR')} XPF</p>
            <p className="text-sm text-muted-foreground">par mois</p>
            <Separator className="my-4" />
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Annonceur</h3>
            {listing.author && <p className="mt-2 font-medium">{listing.author.name}</p>}
          </div>

          {isOwner && (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => router.push(`/listings/${listing.slug}/edit`)}>Modifier</Button>
              <Button variant="destructive" className="w-full" onClick={() => { if (confirm('Supprimer cette annonce ?')) deleteM.mutate({ id: listing.id }) }}>
                Supprimer
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
