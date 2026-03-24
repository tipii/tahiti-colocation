import { Image, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import type { Listing } from '@coloc/shared/types'
import { DURATION_LABELS } from '@coloc/shared/constants'
import type { DurationType } from '@coloc/shared/constants'

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter()
  const firstImage = listing.images?.[0]
  const durationLabel = DURATION_LABELS[listing.durationType as DurationType]

  return (
    <Pressable
      className="overflow-hidden rounded-card bg-card shadow-sm"
      onPress={() => router.push(`/listing/${listing.slug}` as any)}
    >
      {firstImage?.mediumUrl ? (
        <Image
          source={{ uri: firstImage.mediumUrl }}
          className="h-44 w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-44 w-full bg-muted" />
      )}
      <View className="p-4">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {listing.title}
        </Text>
        <View className="mt-1.5 flex-row items-center gap-1">
          <Feather name="map-pin" size={14} color="#0D9488" />
          <Text className="text-sm text-muted-foreground">
            {listing.commune}, {listing.island}
          </Text>
        </View>
        <View className="mt-2.5 flex-row items-center justify-between">
          <View className="rounded-pill bg-accent px-3 py-1">
            <Text className="text-sm font-bold text-primary">
              {listing.price.toLocaleString('fr-FR')} XPF
            </Text>
          </View>
          <View className="rounded-pill bg-muted px-2.5 py-1">
            <Text className="text-xs text-muted-foreground">{durationLabel}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}
