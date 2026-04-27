import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { LISTING_TYPES, LISTING_TYPE_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS, DEFAULT_COUNTRY } from '@coloc/shared/constants'
import type { ListingType, RoomType } from '@coloc/shared/constants'

import { orpc, client } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'
import { ListingSkeletonList } from '@/components/ListingCardSkeleton'
import { MapResults } from '@/components/MapResults'

function useDebounce(value: string, delay = 500) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      className={`rounded-pill px-3.5 py-2 ${active ? 'bg-primary' : 'bg-card border border-border'}`}
      onPress={() => { Haptics.selectionAsync(); onPress() }}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text className={`text-sm font-medium ${active ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text>
    </Pressable>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5">
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</Text>
      {children}
    </View>
  )
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets()
  const bottomSheetRef = useRef<BottomSheet>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState<string | null>(null)
  const [listingType, setListingType] = useState<string | null>(null)
  const [roomType, setRoomType] = useState<string | null>(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [pool, setPool] = useState(false)
  const [parking, setParking] = useState(false)
  const [airConditioning, setAirConditioning] = useState(false)
  const [petsAccepted, setPetsAccepted] = useState(false)

  const debouncedSearch = useDebounce(search)
  const debouncedMin = useDebounce(minPrice)
  const debouncedMax = useDebounce(maxPrice)

  const { data: regionOptions = [] } = useQuery(orpc.geo.regions.queryOptions({
    input: { country: DEFAULT_COUNTRY },
    staleTime: 60 * 60 * 1000,
  }))

  const snapPoints = useMemo(() => ['7%', '55%', '85%'], [])
  const [sheetIndex, setSheetIndex] = useState(0)

  const activeFilterCount = [region, listingType, roomType, debouncedMin, debouncedMax, pool, parking, airConditioning, petsAccepted].filter(Boolean).length

  const input = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(region ? { region } : {}),
    ...(listingType ? { listingType: listingType as ListingType } : {}),
    ...(roomType ? { roomType: roomType as RoomType } : {}),
    ...(debouncedMin ? { minPrice: Number(debouncedMin) } : {}),
    ...(debouncedMax ? { maxPrice: Number(debouncedMax) } : {}),
    ...(pool ? { pool: true } : {}),
    ...(parking ? { parking: true } : {}),
    ...(airConditioning ? { airConditioning: true } : {}),
    ...(petsAccepted ? { petsAccepted: true } : {}),
  }

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['listings', 'search', input],
    queryFn: ({ pageParam = 1 }) => client.listing.list({ ...input, page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta
      return page < totalPages ? page + 1 : undefined
    },
    initialPageParam: 1,
  })

  const listings = data?.pages.flatMap((p) => p.data) ?? []
  const total = data?.pages[0]?.meta.total ?? 0

  const resetFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSearch(''); setRegion(null); setListingType(null); setRoomType(null)
    setMinPrice(''); setMaxPrice('')
    setPool(false); setParking(false); setAirConditioning(false); setPetsAccepted(false)
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header + Search */}
      <View className="px-6 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3 rounded-pill border border-border bg-card px-4 py-2.5">
          <Feather name="search" size={18} color="#8B7E74" />
          <TextInput
            className="flex-1 text-base text-foreground"
            placeholder="Rechercher une annonce..."
            placeholderTextColor="#8B7E74"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            accessibilityLabel="Rechercher"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} accessibilityLabel="Effacer la recherche">
              <Feather name="x" size={18} color="#8B7E74" />
            </Pressable>
          )}
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground">
            {isLoading ? 'Recherche...' : `${total} annonce${total > 1 ? 's' : ''} trouvée${total > 1 ? 's' : ''}`}
          </Text>
          <View className="flex-row rounded-pill border border-border bg-card p-0.5">
            {(['list', 'map'] as const).map((v) => (
              <Pressable
                key={v}
                className={`flex-row items-center gap-1 rounded-pill px-3 py-1.5 ${view === v ? 'bg-primary' : ''}`}
                onPress={() => { Haptics.selectionAsync(); setView(v) }}
                accessibilityLabel={v === 'list' ? 'Vue liste' : 'Vue carte'}
                accessibilityState={{ selected: view === v }}
              >
                <Feather name={v === 'list' ? 'list' : 'map'} size={13} color={view === v ? '#fff' : '#8B7E74'} />
                <Text className={`text-xs font-medium ${view === v ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {v === 'list' ? 'Liste' : 'Carte'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Results */}
      {view === 'map' ? (
        <MapResults input={input} bottomInset={80} />
      ) : (
      <FlatList
        data={isLoading ? [] : listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <View className="px-6 pb-4"><ListingCard listing={item as any} /></View>}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 120 }}
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
            <View className="items-center pt-20">
              <Feather name="search" size={48} color="#E8DDD3" />
              <Text className="mt-4 text-base text-muted-foreground">Aucun résultat</Text>
              {activeFilterCount > 0 && (
                <Pressable className="mt-3 rounded-button bg-primary px-5 py-2.5" onPress={resetFilters}>
                  <Text className="text-sm font-medium text-primary-foreground">Réinitialiser les filtres</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
      />
      )}

      {/* Bottom Sheet Filters */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={setSheetIndex}
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderTopWidth: 1, borderColor: '#E8DDD3' }}
        handleIndicatorStyle={{ backgroundColor: '#E8DDD3', width: 40 }}
      >
        {/* Handle area */}
        <Pressable className="flex-row items-center justify-between px-6 pb-2" onPress={() => bottomSheetRef.current?.snapToIndex(sheetIndex === 0 ? 1 : 0)}>
          <View className="flex-row items-center gap-2">
            <Feather name="sliders" size={18} color="#FF6B35" />
            <Text className="text-base font-semibold text-foreground">Filtres</Text>
            {activeFilterCount > 0 && (
              <View className="min-w-[20px] items-center rounded-full bg-primary px-1.5 py-0.5">
                <Text className="text-xs font-bold text-primary-foreground">{activeFilterCount}</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-3">
            {activeFilterCount > 0 && (
              <Pressable onPress={resetFilters} accessibilityLabel="Réinitialiser">
                <Text className="text-sm font-medium text-primary">Réinitialiser</Text>
              </Pressable>
            )}
            <Feather name={sheetIndex > 0 ? 'chevron-down' : 'chevron-up'} size={18} color="#8B7E74" />
          </View>
        </Pressable>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 24 }}>
          {/* Region */}
          <FilterSection title="Île">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Chip label="Toutes" active={!region} onPress={() => setRegion(null)} />
                {regionOptions.filter((r) => r.code !== 'other').map((r) => (
                  <Chip key={r.code} label={r.label} active={region === r.code} onPress={() => setRegion(region === r.code ? null : r.code)} />
                ))}
              </View>
            </ScrollView>
          </FilterSection>

          {/* Duration */}
          <FilterSection title="Type de location">
            <View className="flex-row gap-2">
              {LISTING_TYPES.map((dt) => (
                <Chip key={dt} label={LISTING_TYPE_LABELS[dt]} active={listingType === dt} onPress={() => setListingType(listingType === dt ? null : dt)} />
              ))}
            </View>
          </FilterSection>

          {/* Room type */}
          <FilterSection title="Logement">
            <View className="flex-row gap-2">
              {ROOM_TYPES.map((rt) => (
                <Chip key={rt} label={ROOM_TYPE_LABELS[rt]} active={roomType === rt} onPress={() => setRoomType(roomType === rt ? null : rt)} />
              ))}
            </View>
          </FilterSection>

          {/* Price range */}
          <FilterSection title="Budget (XPF/mois)">
            <View className="flex-row items-center gap-2">
              <TextInput className="flex-1 rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground" placeholder="Min" placeholderTextColor="#8B7E74" keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} accessibilityLabel="Prix minimum" />
              <Text className="text-muted-foreground">—</Text>
              <TextInput className="flex-1 rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground" placeholder="Max" placeholderTextColor="#8B7E74" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} accessibilityLabel="Prix maximum" />
            </View>
          </FilterSection>

          {/* Amenities */}
          <FilterSection title="Équipements">
            <View className="flex-row flex-wrap gap-2">
              {[
                { value: pool, set: setPool, icon: 'sunset', label: 'Piscine' },
                { value: parking, set: setParking, icon: 'truck', label: 'Parking' },
                { value: airConditioning, set: setAirConditioning, icon: 'wind', label: 'Climatisation' },
                { value: petsAccepted, set: setPetsAccepted, icon: 'heart', label: 'Animaux acceptés' },
              ].map(({ value, set, icon, label }) => (
                <Pressable
                  key={label}
                  className={`flex-row items-center gap-2 rounded-pill px-3.5 py-2 ${value ? 'bg-primary' : 'bg-card border border-border'}`}
                  onPress={() => { Haptics.selectionAsync(); set(!value) }}
                  accessibilityLabel={`${label} ${value ? 'activé' : 'désactivé'}`}
                >
                  <Feather name={icon as any} size={14} color={value ? '#fff' : '#8B7E74'} />
                  <Text className={`text-sm font-medium ${value ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </FilterSection>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  )
}
