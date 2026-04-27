import { useMemo, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native'
import type { StyleSpecification } from '@maplibre/maplibre-react-native'
import { Feather } from '@expo/vector-icons'

import { client } from '@/lib/orpc'

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

type Listing = {
  id: string
  slug: string
  title: string
  price: number
  city: string
  region: string
  regionLabel?: string
  latitude: string | null
  longitude: string | null
  images?: { thumbnailUrl: string | null }[]
}

export function MapResults({ input, bottomInset = 80 }: { input: Record<string, unknown>; bottomInset?: number }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // limit caps at 50 in the contract — fine for v1 (PF has ~30 seeded listings).
  // When density grows, switch to viewport-bounded queries (refetch on map move).
  const { data, isLoading } = useQuery({
    queryKey: ['listings', 'map', input],
    queryFn: () => client.listing.list({ ...input, page: 1, limit: 50 }),
    staleTime: 30 * 1000,
  })

  const listings: Listing[] = useMemo(
    () => (data?.data ?? []).filter((l) => l.latitude && l.longitude) as Listing[],
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
      <Map
        mapStyle={OSM_STYLE}
        style={{ flex: 1 }}
        onPress={() => setSelectedId(null)}
      >
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

      {selected && (
        <Pressable
          style={{ bottom: bottomInset }}
          className="absolute left-4 right-4 flex-row items-center gap-3 rounded-card bg-card p-3 shadow-lg"
          onPress={() => router.push(`/listing/${selected.slug}` as any)}
          accessibilityLabel={`Voir l'annonce ${selected.title}`}
        >
          {selected.images?.[0]?.thumbnailUrl ? (
            <Image
              source={{ uri: selected.images[0].thumbnailUrl }}
              style={{ width: 64, height: 64, borderRadius: 8 }}
            />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 8 }} className="bg-muted" />
          )}
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {selected.title}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {selected.city}, {selected.regionLabel ?? selected.region}
            </Text>
            <Text className="mt-1 text-sm font-bold text-primary">
              {selected.price.toLocaleString('fr-FR')} XPF/mois
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.()
              setSelectedId(null)
            }}
            hitSlop={8}
            accessibilityLabel="Fermer"
          >
            <Feather name="x" size={20} color="#8B7E74" />
          </Pressable>
        </Pressable>
      )}
    </View>
  )
}
