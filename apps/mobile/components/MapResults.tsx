import { useCallback, useMemo, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native'
import { Feather } from '@expo/vector-icons'

import { client } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'

// OpenFreeMap vector tiles — free, no API key, OSM-derived, hosted by them.
// Alternatives: 'positron' (minimal grayscale), 'bright' (more colorful), '3d' (extruded buildings).
// For prod scale: swap to MapTiler / Stadia paid plans or self-hosted Protomaps PMTiles on R2.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

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

  // Single FeatureCollection feeds one GeoJSONSource — much cheaper than one
  // ViewAnnotation per listing, which lags during pan/zoom because each
  // marker re-projects through the JS bridge each frame.
  const featureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: listings.map((l) => ({
        type: 'Feature' as const,
        id: l.id,
        properties: {
          id: l.id,
          label: `${Math.round(l.price / 1000)}k`,
          selected: selectedId === l.id ? 1 : 0,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(l.longitude), Number(l.latitude)] as [number, number],
        },
      })),
    }),
    [listings, selectedId],
  )

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
      <Map mapStyle={MAP_STYLE_URL} style={{ flex: 1 }}>
        <Camera initialViewState={initialViewState} />
        <GeoJSONSource
          id="listings-source"
          data={featureCollection}
          onPress={(e) => {
            const id = e.nativeEvent.features?.[0]?.properties?.id
            if (typeof id === 'string') setSelectedId(id)
          }}
        >
          <Layer
            id="listings-bg"
            type="circle"
            paint={{
              'circle-radius': 18,
              'circle-color': ['case', ['==', ['get', 'selected'], 1], '#0D9488', '#FF6B35'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
              'circle-pitch-alignment': 'map',
            }}
          />
          <Layer
            id="listings-label"
            type="symbol"
            layout={{
              'text-field': ['get', 'label'],
              'text-size': 12,
              'text-font': ['Noto Sans Bold'],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            }}
            paint={{
              'text-color': '#FFFFFF',
            }}
          />
        </GeoJSONSource>
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
