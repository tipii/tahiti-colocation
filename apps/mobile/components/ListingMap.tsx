import { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native'
import { Feather } from '@expo/vector-icons'

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

/**
 * Read-only map preview for the listing detail page. Same OpenFreeMap style
 * as the search tab; the pin is rendered natively (circle layers, no JS-bridge
 * drift). Tap to expand to a full-screen viewer with free pan/zoom.
 *
 * The pin is the public, jittered/approximate position — never the exact
 * address (see seed jitter / form copy).
 */
function pointFeature(lat: number, lng: number) {
  return {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] },
    }],
  }
}

function PinLayers() {
  return (
    <>
      <Layer
        id="lm-outer"
        type="circle"
        style={{
          circleRadius: 12,
          circleColor: '#FFFFFF',
          circleStrokeWidth: 2,
          circleStrokeColor: '#FF6B35',
          circlePitchAlignment: 'map',
        }}
      />
      <Layer
        id="lm-inner"
        type="circle"
        style={{ circleRadius: 6, circleColor: '#FF6B35', circlePitchAlignment: 'map' }}
      />
    </>
  )
}

export function ListingMap({
  latitude,
  longitude,
  height = 180,
}: {
  latitude: number
  longitude: number
  height?: number
}) {
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const fc = useMemo(() => pointFeature(latitude, longitude), [latitude, longitude])

  return (
    <>
      <View style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0001' }}>
        <Map
          mapStyle={MAP_STYLE_URL}
          style={{ flex: 1 }}
          // Lock all gestures — preview only.
          dragPan={false}
          touchZoom={false}
          doubleTapZoom={false}
          doubleTapHoldZoom={false}
          touchRotate={false}
          touchPitch={false}
          attribution={false}
        >
          <Camera
            key={`${latitude}-${longitude}`}
            initialViewState={{ center: [longitude, latitude], zoom: 13 }}
          />
          <GeoJSONSource id="listing-pin-preview" data={fc}>
            <PinLayers />
          </GeoJSONSource>
        </Map>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(true)}
          accessibilityLabel="Voir en plein écran"
          accessibilityRole="button"
        />
        <View
          pointerEvents="none"
          className="absolute bottom-3 right-3 flex-row items-center gap-2 rounded-pill bg-card px-4 py-2 shadow"
        >
          <Feather name="maximize-2" size={14} color="#0D9488" />
          <Text className="text-sm font-semibold text-foreground">Voir la carte</Text>
        </View>
      </View>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <Map mapStyle={MAP_STYLE_URL} style={{ flex: 1 }}>
            <Camera initialViewState={{ center: [longitude, latitude], zoom: 14 }} />
            <GeoJSONSource id="listing-pin-full" data={fc}>
              <PinLayers />
            </GeoJSONSource>
          </Map>

          <View
            style={{ paddingTop: insets.top + 8 }}
            className="absolute left-0 right-0 top-0 flex-row items-center justify-between bg-background/95 px-4 pb-3"
          >
            <Pressable onPress={() => setOpen(false)} accessibilityLabel="Fermer">
              <Text className="text-base font-medium text-foreground">Fermer</Text>
            </Pressable>
            <Text className="text-sm font-semibold text-foreground">Position de l'annonce</Text>
            <View style={{ width: 64 }} />
          </View>

          <View
            style={{ paddingBottom: insets.bottom + 16 }}
            className="absolute bottom-0 left-0 right-0 bg-background/95 px-6 pt-3"
          >
            <Text className="text-xs text-muted-foreground">
              📍 Position approximative — l'adresse exacte est partagée seulement après acceptation.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  )
}
