import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import type { Listing } from '@coloc/shared/types'
import { DURATION_LABELS, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, RoomType } from '@coloc/shared/constants'

const AMENITY_ICONS: [string, string, string][] = [
  ['privateBathroom', 'droplet', 'SdB privée'],
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
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.commune}, ${listing.price.toLocaleString('fr-FR')} XPF par mois`}
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
        <View className="absolute top-3 left-3 rounded-pill bg-white/90 px-2.5 py-1" accessibilityElementsHidden>
          <Text className="text-xs font-medium text-foreground">{durationLabel}</Text>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {listing.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-1">
          <Feather name="map-pin" size={13} color="#0D9488" />
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>{listing.commune}, {listing.island}</Text>
        </View>
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
