import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { ISLANDS, DURATION_TYPES, DURATION_LABELS } from '@coloc/shared/constants'

import { authClient } from '@/lib/auth'
import { orpc } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'

export default function HomeScreen() {
  const { data: session } = authClient.useSession()
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)

  const input = {
    ...(selectedIsland ? { island: selectedIsland as any } : {}),
    ...(selectedDuration ? { durationType: selectedDuration as any } : {}),
  }

  const { data, isLoading, refetch, isRefetching } = useQuery(
    orpc.listing.list.queryOptions({ input }),
  )

  const listings = data?.data ?? []

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-3xl font-bold">Coloc</Text>
        {session && (
          <Text className="mt-1 text-base text-gray-500">Bonjour, {session.user.name}</Text>
        )}
      </View>

      <View className="gap-2 px-6 pb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            <Pressable className={`rounded-full px-3 py-1.5 ${!selectedIsland ? 'bg-black' : 'bg-gray-100'}`} onPress={() => setSelectedIsland(null)}>
              <Text className={`text-sm ${!selectedIsland ? 'text-white' : 'text-gray-700'}`}>Toutes les iles</Text>
            </Pressable>
            {ISLANDS.filter((i) => i !== 'Other').map((island) => (
              <Pressable key={island} className={`rounded-full px-3 py-1.5 ${selectedIsland === island ? 'bg-black' : 'bg-gray-100'}`} onPress={() => setSelectedIsland(selectedIsland === island ? null : island)}>
                <Text className={`text-sm ${selectedIsland === island ? 'text-white' : 'text-gray-700'}`}>{island}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {DURATION_TYPES.map((dt) => (
              <Pressable key={dt} className={`rounded-full px-3 py-1.5 ${selectedDuration === dt ? 'bg-black' : 'bg-gray-100'}`} onPress={() => setSelectedDuration(selectedDuration === dt ? null : dt)}>
                <Text className={`text-sm ${selectedDuration === dt ? 'text-white' : 'text-gray-700'}`}>{DURATION_LABELS[dt]}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <View className="px-6 pb-3"><ListingCard listing={item as any} /></View>}
          onRefresh={() => refetch()}
          refreshing={isRefetching}
          ListEmptyComponent={<View className="items-center px-6 pt-20"><Text className="text-center text-base text-gray-400">Aucune annonce pour le moment</Text></View>}
        />
      )}
    </View>
  )
}
