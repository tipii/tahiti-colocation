import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import type { Listing } from '@coloc/shared/types'
import { LISTING_TYPE_LABELS, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { ListingType, RoomType } from '@coloc/shared/constants'

import { authClient } from '@/lib/auth'
import { orpc } from '@/lib/orpc'
import { CandidatureBadge } from '@/components/CandidatureStatus'
import { FavoriteButton } from '@/components/FavoriteButton'

const AMENITY_ICONS: [string, string, string][] = [
  ['privateBathroom', 'droplet', 'SdB privée'],
  ['pool', 'sunset', 'Piscine'],
  ['parking', 'truck', 'Parking'],
  ['airConditioning', 'wind', 'Clim'],
  ['petsAccepted', 'heart', 'Animaux'],
]

function colocLabel(roommateCount: number, roomType: RoomType): string {
  const base = `Coloc à ${roommateCount}`
  if (roomType === 'single') return `${base} + 1 (toi)`
  if (roomType === 'couple') return `${base} + 2 (vous)`
  return `${base} + 1 ou 2 (toi ou vous)`
}

export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const firstImage = listing.images?.[0]
  const durationLabel = LISTING_TYPE_LABELS[listing.listingType as ListingType]
  const roomLabel = ROOM_TYPE_LABELS[listing.roomType as RoomType]
  const activeAmenities = AMENITY_ICONS.filter(([key]) => (listing as any)[key])

  // Pull from the same cache as listing/[id] and the candidatures tab — single fetch shared via TanStack Query
  const { data: myCandidatures = [] } = useQuery({
    ...orpc.candidature.mine.queryOptions(),
    enabled: !!session,
  })
  const myCandidature = myCandidatures.find((c: any) => c.listingId === listing.id)
  return (
    <Pressable
      className="overflow-hidden rounded-card bg-card shadow-sm"
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.city}, ${listing.price.toLocaleString('fr-FR')} XPF par mois`}
      onPress={() => router.push(`/listing/${listing.slug}` as any)}
    >
      <View className="relative">
        {firstImage?.mediumUrl ? (
          <Image
            source={{ uri: firstImage.mediumUrl ?? '' }}
            style={{ width: '100%', height: 192 }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Photo de ${listing.title}`}
          />
        ) : (
          <View className="h-48 w-full items-center justify-center bg-muted">
            <Feather name="image" size={32} color="#E8DDD3" />
          </View>
        )}
        <View className="absolute bottom-3 left-3 rounded-pill bg-primary px-3 py-1" accessibilityElementsHidden>
          <Text className="text-sm font-bold text-primary-foreground">
            {listing.price.toLocaleString('fr-FR')} XPF/mois
          </Text>
        </View>
        <View className="absolute top-3 left-3 flex-row gap-1.5" accessibilityElementsHidden>
          <View className="rounded-pill bg-white/90 px-2.5 py-1">
            <Text className="text-xs font-medium text-foreground">{durationLabel}</Text>
          </View>
          {myCandidature && <CandidatureBadge status={myCandidature.status} />}
        </View>
        <View className="absolute top-3 right-3">
          <FavoriteButton listingId={listing.id} size={18} className="h-8 w-8" />
        </View>
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {listing.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-1">
          <Feather name="map-pin" size={13} color="#0D9488" />
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>{listing.city}, {listing.regionLabel ?? listing.region}</Text>
        </View>
        <View className="mt-2 flex-row items-center gap-1">
          <Feather name="home" size={13} color="#8B7E74" />
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>{colocLabel(listing.roommateCount, listing.roomType as RoomType)}</Text>
        </View>
        <View className="mt-1 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Feather name="tag" size={13} color="#8B7E74" />
            <Text className="text-xs text-muted-foreground">{roomLabel}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Feather name="calendar" size={13} color="#8B7E74" />
            <Text className="text-xs text-muted-foreground">
              {new Date(listing.availableFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
        {activeAmenities.length > 0 && (
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            {activeAmenities.map(([key, icon, label]) => (
              <View key={key} className="flex-row items-center gap-1 rounded-pill bg-accent px-2 py-0.5">
                <Feather name={icon as any} size={11} color="#FF6B35" />
                <Text className="text-xs text-accent-foreground">{label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  )
}
