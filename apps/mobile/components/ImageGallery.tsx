import { useState } from 'react'
import { Modal, Pressable, StatusBar, Text, View, useWindowDimensions, FlatList, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Image } from 'expo-image'
import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'

interface ImageGalleryProps {
  images: { uri: string }[]
  visible: boolean
  initialIndex?: number
  onClose: () => void
}

export function ImageGallery({ images, visible, initialIndex = 0, onClose }: ImageGalleryProps) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!visible || images.length === 0) return null

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <FlatList
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
              <Zoomable
                isDoubleTapEnabled
                isPanEnabled
                isPinchEnabled
                isSingleTapEnabled
                onSingleTap={onClose}
                minScale={1}
                maxScale={5}
                style={{ width, height }}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={{ width, height }}
                  contentFit="contain"
                />
              </Zoomable>
            </View>
          )}
        />

        {/* Close */}
        <Pressable
          style={{
            position: 'absolute',
            right: 16,
            top: insets.top + 8,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.15)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={onClose}
          accessibilityLabel="Fermer la galerie"
        >
          <Feather name="x" size={22} color="#fff" />
        </Pressable>

        {/* Counter */}
        {images.length > 1 && (
          <View style={{ position: 'absolute', bottom: insets.bottom + 16, width: '100%', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  )
}
