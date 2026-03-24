import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'

export default function FavoritesScreen() {
  const { data: listings = [], isLoading, refetch, isRefetching } = useQuery(
    orpc.favorite.list.queryOptions(),
  )

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <View className="px-6 pb-4"><ListingCard listing={item as any} /></View>}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        contentContainerStyle={{ paddingTop: 16 }}
        ListEmptyComponent={<View className="items-center pt-20"><Text className="text-base text-muted-foreground">Aucun favori pour le moment</Text></View>}
      />
    </View>
  )
}
