import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'

const TRACK_HEIGHT = 4
const DEFAULT_THUMB = 22

type SliderProps = {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  trackColor?: string
  fillColor?: string
  thumbColor?: string
  thumbSize?: number
}

/**
 * Custom slider built on react-native-gesture-handler + reanimated. Pure JS,
 * no native module required. Thumb position is a shared value driven on the
 * UI thread; React only re-renders when the snapped value changes.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  trackColor = '#E8DDD3',
  fillColor = '#FF6B35',
  thumbColor = '#FF6B35',
  thumbSize = DEFAULT_THUMB,
}: SliderProps) {
  const [width, setWidth] = useState(0)
  const usable = Math.max(1, width - thumbSize)
  const range = max - min
  const ratio = range > 0 ? (value - min) / range : 0
  const thumbX = useSharedValue(ratio * usable)
  const startX = useSharedValue(0)

  // Keep the thumb position in sync with prop changes (e.g. parent reset).
  useEffect(() => {
    thumbX.value = Math.max(0, Math.min(usable, ratio * usable))
  }, [usable, ratio, thumbX])

  const setValueFromX = useCallback(
    (x: number) => {
      const r = usable > 0 ? x / usable : 0
      let v = min + r * range
      if (step) v = Math.round(v / step) * step
      v = Math.max(min, Math.min(max, v))
      if (v !== value) onChange(v)
    },
    [usable, min, max, range, step, value, onChange],
  )

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = thumbX.value
      runOnJS(Haptics.selectionAsync)()
    })
    .onUpdate((e) => {
      const x = Math.max(0, Math.min(usable, startX.value + e.translationX))
      thumbX.value = x
      runOnJS(setValueFromX)(x)
    })

  const tap = Gesture.Tap().onStart((e) => {
    const x = Math.max(0, Math.min(usable, e.x - thumbSize / 2))
    thumbX.value = x
    runOnJS(setValueFromX)(x)
  })

  const composed = Gesture.Race(pan, tap)

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }))

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + thumbSize / 2,
  }))

  return (
    <GestureDetector gesture={composed}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: thumbSize, justifyContent: 'center' }}
      >
        <View
          style={{
            position: 'absolute',
            left: thumbSize / 2,
            right: thumbSize / 2,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            backgroundColor: trackColor,
          }}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: thumbSize / 2,
              height: TRACK_HEIGHT,
              borderRadius: TRACK_HEIGHT / 2,
              backgroundColor: fillColor,
            },
            fillStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 4,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  )
}
