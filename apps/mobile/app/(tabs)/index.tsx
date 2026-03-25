import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useInfiniteQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { ISLANDS, DURATION_TYPES, DURATION_LABELS } from '@coloc/shared/constants'

import { authClient } from '@/lib/auth'
import { client } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'
import { ListingSkeletonList } from '@/components/ListingCardSkeleton'

export default function HomeScreen() {
  const { data: session } = authClient.useSession()
  const insets = useSafeAreaInsets()
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)

  const input = {
    ...(selectedIsland ? { island: selectedIsland as any } : {}),
    ...(selectedDuration ? { durationType: selectedDuration as any } : {}),
  }

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['listings', 'home', input],
    queryFn: ({ pageParam = 1 }) => client.listing.list({ ...input, page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta
      return page < totalPages ? page + 1 : undefined
    },
    initialPageParam: 1,
  })

  const listings = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-3xl font-bold text-foreground">Coloc Tahiti</Text>
        {session && (
          <Text className="mt-1 text-base text-muted-foreground">
            Ia ora na, {session.user.name} 🌺
          </Text>
        )}
        <Text className="mt-3 text-lg text-secondary font-medium italic">
          Trouve ta coloc au paradis
        </Text>
      </View>

      <View className="gap-2 px-6 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            <Pressable
              className={`rounded-pill px-4 py-2 ${!selectedIsland ? 'bg-primary' : 'bg-muted'}`}
              onPress={() => { Haptics.selectionAsync(); setSelectedIsland(null) }}
              accessibilityLabel="Toutes les îles"
              accessibilityRole="button"
              accessibilityState={{ selected: !selectedIsland }}
            >
              <Text className={`text-sm font-medium ${!selectedIsland ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                Toutes les iles
              </Text>
            </Pressable>
            {ISLANDS.filter((i) => i !== 'Other').map((island) => (
              <Pressable
                key={island}
                className={`rounded-pill px-4 py-2 ${selectedIsland === island ? 'bg-primary' : 'bg-muted'}`}
                onPress={() => { Haptics.selectionAsync(); setSelectedIsland(selectedIsland === island ? null : island) }}
              >
                <Text className={`text-sm font-medium ${selectedIsland === island ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {island}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {DURATION_TYPES.map((dt) => (
              <Pressable
                key={dt}
                className={`rounded-pill px-4 py-2 ${selectedDuration === dt ? 'bg-secondary' : 'bg-muted'}`}
                onPress={() => { Haptics.selectionAsync(); setSelectedDuration(selectedDuration === dt ? null : dt) }}
              >
                <Text className={`text-sm font-medium ${selectedDuration === dt ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                  {DURATION_LABELS[dt]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={isLoading ? [] : listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-6 pb-4">
            <ListingCard listing={item as any} />
          </View>
        )}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={isLoading ? <ListingSkeletonList /> : null}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4"><ActivityIndicator color="#FF6B35" /></View>
          ) : !isLoading && listings.length > 0 && !hasNextPage ? (
            <View className="items-center py-6">
              <Text className="text-sm text-muted-foreground">Vous avez tout vu 🌺</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center px-6 pt-20">
              <Text className="text-center text-lg text-muted-foreground">
                Aucune annonce pour le moment 🏝️
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}
