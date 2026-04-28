'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import * as LucideIcons from 'lucide-react'
import { MapPin, Home, Users, Calendar, type LucideIcon } from 'lucide-react'
import type { Listing } from '@coloc/shared/types'
import { LISTING_TYPE_LABELS, ROOM_TYPE_LABELS, HOUSING_TYPE_LABELS } from '@coloc/shared/constants'
import type { ListingType, RoomType, HousingType } from '@coloc/shared/constants'

import { orpc } from '@/lib/orpc'
import { Card, CardContent } from '@/components/ui/card'

// Convert Feather kebab-case (e.g. 'rotate-cw') to Lucide PascalCase ('RotateCw').
function lucideIcon(name: string): LucideIcon {
  const pascal = name.split('-').map((p) => p[0]?.toUpperCase() + p.slice(1)).join('')
  return ((LucideIcons as any)[pascal] ?? LucideIcons.Circle) as LucideIcon
}

function colocLabel(roommateCount: number, roomType: RoomType): string {
  const base = `Coloc à ${roommateCount}`
  if (roomType === 'single') return `${base} + 1 (toi)`
  if (roomType === 'couple') return `${base} + 2 (vous)`
  return `${base} + 1 ou 2 (toi ou vous)`
}

export function ListingCard({ listing }: { listing: Listing }) {
  const firstImage = listing.images?.[0]
  const durationLabel = LISTING_TYPE_LABELS[listing.listingType as ListingType]
  const roomLabel = ROOM_TYPE_LABELS[listing.roomType as RoomType]

  const { data: amenityCatalog = [] } = useQuery(orpc.meta.amenities.queryOptions({
    staleTime: 60 * 60 * 1000,
  }))
  const listingAmenityCodes = (listing.amenities ?? []) as string[]
  const matchedAmenities = amenityCatalog.filter((a) => listingAmenityCodes.includes(a.code))
  const AMENITY_VISIBLE = 4
  const activeAmenities = matchedAmenities.slice(0, AMENITY_VISIBLE)
  const extraAmenities = matchedAmenities.length - activeAmenities.length

  return (
    <Link href={`/listings/${listing.slug}`}>
      <Card className="overflow-hidden rounded-2xl border-border/50 transition-shadow hover:shadow-lg">
        {/* Image + overlays */}
        <div className="relative aspect-[4/3] bg-muted">
          {firstImage?.mediumUrl && (
            <img src={firstImage.mediumUrl} alt={listing.title} className="h-full w-full object-cover" />
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
            {listing.price.toLocaleString('fr-FR')} XPF/mois
          </span>
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground">
              {durationLabel}
            </span>
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground">
              {HOUSING_TYPE_LABELS[listing.housingType as HousingType]}
            </span>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="line-clamp-1 font-bold text-foreground">{listing.title}</h3>

          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-secondary" />
            {listing.cityLabel ?? listing.city}, {listing.regionLabel ?? listing.region}
          </p>

          {/* Coloc makeup */}
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Home className="h-3 w-3" />
            {colocLabel(listing.roommateCount, listing.roomType as RoomType)}
          </p>

          {/* Secondary meta */}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {roomLabel}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(listing.availableFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* Amenity badges */}
          {activeAmenities.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {activeAmenities.map((a) => {
                const Icon = lucideIcon(a.icon)
                return (
                  <span key={a.code} className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                    <Icon className="h-3 w-3" /> {a.label}
                  </span>
                )
              })}
              {extraAmenities > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  +{extraAmenities}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
