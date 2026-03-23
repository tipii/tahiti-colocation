import Image from 'next/image'
import Link from 'next/link'
import type { Listing } from '@coloc/shared/types'
import { DURATION_LABELS } from '@coloc/shared/constants'
import type { DurationType } from '@coloc/shared/constants'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function ListingCard({ listing }: { listing: Listing }) {
  const firstImage = listing.images?.[0]
  const durationLabel = DURATION_LABELS[listing.durationType as DurationType]

  return (
    <Link href={`/listings/${listing.slug}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {firstImage?.mediumUrl && (
            <img
              src={firstImage.mediumUrl}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold">{listing.title}</h3>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {durationLabel}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {listing.commune}, {listing.island}
          </p>
          <p className="mt-2 text-base font-bold">
            {listing.price.toLocaleString('fr-FR')} XPF/mois
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
