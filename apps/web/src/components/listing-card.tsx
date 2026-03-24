import Link from 'next/link'
import { MapPin } from 'lucide-react'
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
      <Card className="overflow-hidden rounded-2xl border-border/50 transition-shadow hover:shadow-lg">
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
          <h3 className="line-clamp-1 font-semibold text-foreground">{listing.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-secondary" />
            {listing.commune}, {listing.island}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-primary">
              {listing.price.toLocaleString('fr-FR')} XPF
            </span>
            <Badge variant="secondary" className="text-xs">
              {durationLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
