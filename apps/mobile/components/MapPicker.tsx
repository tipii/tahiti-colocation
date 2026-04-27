import { useState } from 'react'
import { View } from 'react-native'
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native'
import { Feather } from '@expo/vector-icons'

// Same OpenFreeMap style as the search-tab map.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

/**
 * Embedded map for the listing create/edit form. The provider taps anywhere
 * to place the pin (no draggable thumb in v11 of maplibre-react-native).
 *
 * Coords are stored as-is — there is NO server-side jitter. The form copy
 * tells the provider to place the pin approximately, since it is visible to
 * every seeker browsing the map.
 *
 * Remount via `key` when the parent's city changes so the camera re-centers.
 */
export function MapPicker({
  initialLat,
  initialLng,
  onChange,
  height = 240,
}: {
  initialLat: number
  initialLng: number
  onChange: (lat: number, lng: number) => void
  height?: number
}) {
  const [marker, setMarker] = useState({ lat: initialLat, lng: initialLng })

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0001' }}>
      <Map
        mapStyle={MAP_STYLE_URL}
        style={{ flex: 1 }}
        onPress={(e) => {
          const [lng, lat] = e.nativeEvent.lngLat
          setMarker({ lat, lng })
          onChange(lat, lng)
        }}
      >
        <Camera initialViewState={{ center: [marker.lng, marker.lat], zoom: 13 }} />
        <Marker lngLat={[marker.lng, marker.lat]} anchor="bottom">
          <View style={{ alignItems: 'center' }}>
            <Feather name="map-pin" size={36} color="#FF6B35" />
          </View>
        </Marker>
      </Map>
    </View>
  )
}
