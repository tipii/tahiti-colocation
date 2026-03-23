import { Image, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
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
      className="overflow-hidden rounded-xl border border-gray-200"
      onPress={() => router.push(`/listing/${listing.slug}` as any)}
    >
      {firstImage?.mediumUrl ? (
        <Image
          source={{ uri: firstImage.mediumUrl }}
          className="h-40 w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-40 w-full bg-gray-100" />
      )}
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
            {listing.title}
          </Text>
          <View className="ml-2 rounded-full bg-gray-100 px-2 py-0.5">
            <Text className="text-xs text-gray-600">{durationLabel}</Text>
          </View>
        </View>
        <Text className="mt-1 text-sm text-gray-500">
          {listing.commune}, {listing.island}
        </Text>
        <Text className="mt-2 text-lg font-bold">
          {listing.price.toLocaleString('fr-FR')} XPF/mois
        </Text>
      </View>
    </Pressable>
  )
}
