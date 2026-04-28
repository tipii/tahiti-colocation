import { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native'
import { Feather } from '@expo/vector-icons'

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

/**
 * Listing-form pin picker.
 *
 * The form shows a non-interactive preview map with the pin baked in; tapping
 * it opens a full-screen modal where the actual placement happens. Doing it
 * as a separate screen avoids the gesture conflict between ScrollView (vertical
 * drag) and Map (one-finger pan) that broke the embedded usage.
 *
 * Markers are rendered via GeoJSONSource + native circle layers (same pattern
 * as the search-tab markers) so the pin stays pixel-locked to the coords
 * during pan/zoom — no JS-bridge re-projection per frame.
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
        id="pin-outer"
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
        id="pin-inner"
        type="circle"
        style={{ circleRadius: 6, circleColor: '#FF6B35', circlePitchAlignment: 'map' }}
      />
    </>
  )
}

export function MapPicker({
  initialLat,
  initialLng,
  onChange,
  previewHeight = 140,
}: {
  initialLat: number
  initialLng: number
  onChange: (lat: number, lng: number) => void
  previewHeight?: number
}) {
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ lat: initialLat, lng: initialLng })

  const previewFC = useMemo(() => pointFeature(initialLat, initialLng), [initialLat, initialLng])
  const draftFC = useMemo(() => pointFeature(draft.lat, draft.lng), [draft])

  const openPicker = () => {
    setDraft({ lat: initialLat, lng: initialLng })
    setOpen(true)
  }

  const confirm = () => {
    onChange(draft.lat, draft.lng)
    setOpen(false)
  }

  return (
    <>
      {/* Non-interactive preview — the Map renders below; an absolute Pressable
          on top owns every tap so we never fight the parent ScrollView. */}
      <View
        style={{ height: previewHeight, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0001' }}
      >
        <Map
          mapStyle={MAP_STYLE_URL}
          style={{ flex: 1 }}
          // Lock all gestures — this is just a thumbnail.
          dragPan={false}
          touchZoom={false}
          doubleTapZoom={false}
          doubleTapHoldZoom={false}
          touchRotate={false}
          touchPitch={false}
          attribution={false}
        >
          <Camera
            // Re-mount when the parent's coords change (e.g. city switch) so
            // the preview re-centers on the new location.
            key={`${initialLat}-${initialLng}`}
            initialViewState={{ center: [initialLng, initialLat], zoom: 13 }}
          />
          <GeoJSONSource id="pin-preview" data={previewFC}>
            <PinLayers />
          </GeoJSONSource>
        </Map>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={openPicker}
          accessibilityLabel="Modifier la position"
          accessibilityRole="button"
        />
        <View
          pointerEvents="none"
          className="absolute bottom-3 right-3 flex-row items-center gap-2 rounded-pill bg-primary px-5 py-2.5 shadow-lg"
        >
          <Feather name="edit-2" size={16} color="#fff" />
          <Text className="text-sm font-semibold text-primary-foreground">Modifier la position</Text>
        </View>
      </View>

      {/* Full-screen edit modal — free pan/zoom, tap to place. */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <Map
            mapStyle={MAP_STYLE_URL}
            style={{ flex: 1 }}
            onPress={(e) => {
              const [lng, lat] = e.nativeEvent.lngLat
              setDraft({ lat, lng })
            }}
          >
            <Camera initialViewState={{ center: [draft.lng, draft.lat], zoom: 13 }} />
            <GeoJSONSource id="pin-edit" data={draftFC}>
              <PinLayers />
            </GeoJSONSource>
          </Map>

          {/* Header: Annuler · title · Confirmer */}
          <View
            style={{ paddingTop: insets.top + 8 }}
            className="absolute left-0 right-0 top-0 flex-row items-center justify-between bg-background/95 px-4 pb-3"
          >
            <Pressable onPress={() => setOpen(false)} accessibilityLabel="Annuler">
              <Text className="text-base font-medium text-foreground">Annuler</Text>
            </Pressable>
            <Text className="text-sm font-semibold text-foreground">Position de l'annonce</Text>
            <Pressable onPress={confirm} accessibilityLabel="Confirmer">
              <Text className="text-base font-semibold text-primary">Confirmer</Text>
            </Pressable>
          </View>

          {/* Footer hint */}
          <View
            style={{ paddingBottom: insets.bottom + 16 }}
            className="absolute bottom-0 left-0 right-0 bg-background/95 px-6 pt-4"
          >
            <Text className="text-sm text-foreground">
              📍 Touche la carte pour placer la punaise <Text className="font-semibold">approximativement</Text>.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Cette position est visible par tous les utilisateurs — ne place pas la punaise sur ton adresse exacte.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  )
}
