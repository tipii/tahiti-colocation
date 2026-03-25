import { View } from 'react-native'

export function ListingCardSkeleton() {
  return (
    <View className="overflow-hidden rounded-card bg-card shadow-sm">
      <View className="h-48 w-full bg-muted" />
      <View className="p-4 gap-2">
        <View className="h-5 w-3/4 rounded bg-muted" />
        <View className="h-4 w-1/2 rounded bg-muted" />
        <View className="h-4 w-2/3 rounded bg-muted" />
        <View className="mt-1 flex-row gap-1.5">
          <View className="h-5 w-16 rounded-pill bg-muted" />
          <View className="h-5 w-14 rounded-pill bg-muted" />
        </View>
      </View>
    </View>
  )
}

export function ListingSkeletonList() {
  return (
    <View className="gap-4 px-6 pt-2">
      <ListingCardSkeleton />
      <ListingCardSkeleton />
      <ListingCardSkeleton />
    </View>
  )
}
