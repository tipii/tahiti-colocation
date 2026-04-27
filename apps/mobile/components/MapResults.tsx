import { useCallback, useMemo, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native'
import type { StyleSpecification } from '@maplibre/maplibre-react-native'
import { Feather } from '@expo/vector-icons'

import { client } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'

// OSM raster tiles. Acceptable for dev/early stage. Before public launch, swap
// to a self-hosted Protomaps file on R2 or a paid tile provider — OSMF policy
// forbids high-traffic apps using their public tile servers.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      minzoom: 0,
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }],
}

const TAHITI_CENTER: [number, number] = [-149.45, -17.65]

type ListingWithCoords = NonNullable<Awaited<ReturnType<typeof client.listing.list>>['data']>[number]

export function MapResults({ input, bottomInset = 80 }: { input: Record<string, unknown>; bottomInset?: number }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Clear selection when leaving the screen so the modal isn't still open on return.
  useFocusEffect(useCallback(() => () => setSelectedId(null), []))

  // limit caps at 50 in the contract — fine for v1 (PF has ~30 seeded listings).
  // When density grows, switch to viewport-bounded queries (refetch on map move).
  const { data, isLoading } = useQuery({
    queryKey: ['listings', 'map', input],
    queryFn: () => client.listing.list({ ...input, page: 1, limit: 50 }),
    staleTime: 30 * 1000,
  })

  const listings: ListingWithCoords[] = useMemo(
    () => (data?.data ?? []).filter((l) => l.latitude && l.longitude),
    [data],
  )

  const selected = listings.find((l) => l.id === selectedId)

  const initialViewState = useMemo(() => {
    if (listings.length === 0) {
      return { center: TAHITI_CENTER, zoom: 7 } as const
    }
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    for (const l of listings) {
      const lat = Number(l.latitude)
      const lng = Number(l.longitude)
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
    // Bounds [west, south, east, north]. Padding keeps pins off the edges.
    return {
      bounds: [minLng, minLat, maxLng, maxLat] as [number, number, number, number],
      padding: { top: 60, bottom: bottomInset + 40, left: 40, right: 40 },
    }
  }, [listings, bottomInset])

  return (
    <View style={{ flex: 1 }}>
      <Map mapStyle={OSM_STYLE} style={{ flex: 1 }}>
        <Camera initialViewState={initialViewState} />
        {listings.map((l) => (
          <Marker
            key={l.id}
            id={l.id}
            lngLat={[Number(l.longitude), Number(l.latitude)]}
            onPress={() => setSelectedId(l.id)}
          >
            <View
              className={`rounded-pill px-2.5 py-1 shadow ${
                selectedId === l.id ? 'bg-secondary' : 'bg-primary'
              }`}
            >
              <Text className="text-xs font-bold text-primary-foreground">
                {Math.round(l.price / 1000)}k
              </Text>
            </View>
          </Marker>
        ))}
      </Map>

      {!isLoading && listings.length === 0 && (
        <View className="absolute left-4 right-4 top-4 items-center rounded-card bg-card p-3 shadow">
          <Text className="text-sm text-muted-foreground">Aucune annonce dans la zone</Text>
        </View>
      )}

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedId(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setSelectedId(null)}
          accessibilityLabel="Fermer"
        >
          {selected && (
            <View className="w-full max-w-md" pointerEvents="box-none">
              <ListingCard listing={selected as any} />
              <Pressable
                className="mt-3 self-center rounded-pill bg-card px-5 py-2 shadow"
                onPress={() => setSelectedId(null)}
                accessibilityLabel="Fermer"
              >
                <View className="flex-row items-center gap-1.5">
                  <Feather name="x" size={14} color="#8B7E74" />
                  <Text className="text-sm font-medium text-foreground">Fermer</Text>
                </View>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  )
}
