import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { ISLANDS, DURATION_TYPES, DURATION_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, Island, RoomType } from '@coloc/shared/constants'

import { orpc } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'
import { ListingSkeletonList } from '@/components/ListingCardSkeleton'

export default function SearchScreen() {
  const insets = useSafeAreaInsets()
  const [island, setIsland] = useState<string | null>(null)
  const [durationType, setDurationType] = useState<string | null>(null)
  const [roomType, setRoomType] = useState<string | null>(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [debouncedMin, setDebouncedMin] = useState('')
  const [debouncedMax, setDebouncedMax] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const debouncePrice = useCallback((value: string, setter: (v: string) => void) => {
    const timer = setTimeout(() => setter(value), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleMinPrice = (v: string) => { setMinPrice(v); debouncePrice(v, setDebouncedMin) }
  const handleMaxPrice = (v: string) => { setMaxPrice(v); debouncePrice(v, setDebouncedMax) }

  const input = {
    ...(island ? { island: island as Island } : {}),
    ...(durationType ? { durationType: durationType as DurationType } : {}),
    ...(roomType ? { roomType: roomType as RoomType } : {}),
    ...(debouncedMin ? { minPrice: Number(debouncedMin) } : {}),
    ...(debouncedMax ? { maxPrice: Number(debouncedMax) } : {}),
  }

  const { data, isLoading, refetch, isRefetching } = useQuery(
    orpc.listing.list.queryOptions({ input }),
  )

  const listings = data?.data ?? []
  const total = data?.meta?.total ?? 0

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Recherche</Text>
          <Pressable onPress={() => setFiltersOpen(!filtersOpen)} accessibilityLabel={filtersOpen ? 'Masquer les filtres' : 'Afficher les filtres'} accessibilityRole="button">
            <Feather name={filtersOpen ? 'chevron-up' : 'sliders'} size={22} color="#FF6B35" />
          </Pressable>
        </View>
      </View>

      {filtersOpen && (
        <View className="px-6 pb-4 gap-3">
          {/* Island */}
          <Text className="text-xs font-semibold text-muted-foreground uppercase">Ile</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <Pressable className={`rounded-pill px-3 py-1.5 ${!island ? 'bg-primary' : 'bg-muted'}`} onPress={() => setIsland(null)}>
                <Text className={`text-sm ${!island ? 'text-primary-foreground' : 'text-muted-foreground'}`}>Toutes</Text>
              </Pressable>
              {ISLANDS.filter((i) => i !== 'Other').map((i) => (
                <Pressable key={i} className={`rounded-pill px-3 py-1.5 ${island === i ? 'bg-primary' : 'bg-muted'}`} onPress={() => setIsland(island === i ? null : i)}>
                  <Text className={`text-sm ${island === i ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{i}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Duration */}
          <Text className="text-xs font-semibold text-muted-foreground uppercase">Duree</Text>
          <View className="flex-row gap-2">
            {DURATION_TYPES.map((dt) => (
              <Pressable key={dt} className={`flex-1 items-center rounded-button py-2 ${durationType === dt ? 'bg-secondary' : 'bg-muted'}`} onPress={() => setDurationType(durationType === dt ? null : dt)}>
                <Text className={`text-xs font-medium ${durationType === dt ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>{DURATION_LABELS[dt]}</Text>
              </Pressable>
            ))}
          </View>

          {/* Room type */}
          <Text className="text-xs font-semibold text-muted-foreground uppercase">Type</Text>
          <View className="flex-row gap-2">
            {ROOM_TYPES.map((rt) => (
              <Pressable key={rt} className={`flex-1 items-center rounded-button py-2 ${roomType === rt ? 'bg-secondary' : 'bg-muted'}`} onPress={() => setRoomType(roomType === rt ? null : rt)}>
                <Text className={`text-xs font-medium ${roomType === rt ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>{ROOM_TYPE_LABELS[rt]}</Text>
              </Pressable>
            ))}
          </View>

          {/* Price range */}
          <Text className="text-xs font-semibold text-muted-foreground uppercase">Prix (XPF/mois)</Text>
          <View className="flex-row gap-3">
            <TextInput className="flex-1 rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground" placeholder="Min" placeholderTextColor="#8B7E74" keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
            <TextInput className="flex-1 rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground" placeholder="Max" placeholderTextColor="#8B7E74" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
          </View>
        </View>
      )}

      {/* Results count */}
      <View className="px-6 pb-2">
        <Text className="text-sm text-muted-foreground">
          {isLoading ? 'Recherche...' : `${total} annonce${total > 1 ? 's' : ''} trouvee${total > 1 ? 's' : ''}`}
        </Text>
      </View>

      {isLoading ? (
        <ListingSkeletonList />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <View className="px-6 pb-4"><ListingCard listing={item as any} /></View>}
          onRefresh={() => refetch()}
          refreshing={isRefetching}
          ListEmptyComponent={<View className="items-center pt-20"><Text className="text-base text-muted-foreground">Aucun resultat</Text></View>}
        />
      )}
    </View>
  )
}
