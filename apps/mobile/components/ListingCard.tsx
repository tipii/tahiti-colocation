import { Image, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import type { Listing } from '@coloc/shared/types'
import { DURATION_LABELS, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, RoomType } from '@coloc/shared/constants'

const AMENITY_ICONS: [string, string, string][] = [
  ['privateBathroom', 'droplet', 'SdB privee'],
  ['pool', 'sunset', 'Piscine'],
  ['parking', 'truck', 'Parking'],
  ['airConditioning', 'wind', 'Clim'],
  ['petsAccepted', 'heart', 'Animaux'],
]

export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter()
  const firstImage = listing.images?.[0]
  const durationLabel = DURATION_LABELS[listing.durationType as DurationType]
  const roomLabel = ROOM_TYPE_LABELS[listing.roomType as RoomType]
  const activeAmenities = AMENITY_ICONS.filter(([key]) => (listing as any)[key])

  return (
    <Pressable
      className="overflow-hidden rounded-card bg-card shadow-sm"
      onPress={() => router.push(`/listing/${listing.slug}` as any)}
    >
      {/* Image + overlays */}
      <View className="relative">
        {firstImage?.mediumUrl ? (
          <Image source={{ uri: firstImage.mediumUrl }} className="h-48 w-full" resizeMode="cover" />
        ) : (
          <View className="h-48 w-full items-center justify-center bg-muted">
            <Feather name="image" size={32} color="#E8DDD3" />
          </View>
        )}
        {/* Price badge */}
        <View className="absolute bottom-3 left-3 rounded-pill bg-primary px-3 py-1">
          <Text className="text-sm font-bold text-primary-foreground">
            {listing.price.toLocaleString('fr-FR')} XPF/mois
          </Text>
        </View>
        {/* Duration badge */}
        <View className="absolute top-3 left-3 rounded-pill bg-white/90 px-2.5 py-1">
          <Text className="text-xs font-medium text-foreground">{durationLabel}</Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-4">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {listing.title}
        </Text>

        {/* Location */}
        <View className="mt-1 flex-row items-center gap-1">
          <Feather name="map-pin" size={13} color="#0D9488" />
          <Text className="text-sm text-muted-foreground">{listing.commune}, {listing.island}</Text>
        </View>

        {/* Room info */}
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Feather name="home" size={13} color="#8B7E74" />
            <Text className="text-xs text-muted-foreground">{roomLabel}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Feather name="users" size={13} color="#8B7E74" />
            <Text className="text-xs text-muted-foreground">{listing.numberOfPeople} pers.</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Feather name="calendar" size={13} color="#8B7E74" />
            <Text className="text-xs text-muted-foreground">
              {new Date(listing.availableFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* Amenity badges */}
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
