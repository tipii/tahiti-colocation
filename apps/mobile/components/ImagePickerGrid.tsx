import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { pickImages, uploadImage } from '@/lib/upload'

interface ImageItem {
  id: string
  uri: string
}

interface ImagePickerGridProps {
  images: ImageItem[]
  onAdd: (image: ImageItem) => void
  onRemove: (id: string) => void
  entityType: 'listing' | 'avatar'
  entityId?: string
  maxImages?: number
}

export function ImagePickerGrid({
  images,
  onAdd,
  onRemove,
  entityType,
  entityId,
  maxImages = 10,
}: ImagePickerGridProps) {
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const prevCount = useRef(images.length)

  useEffect(() => {
    if (images.length > prevCount.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
    prevCount.current = images.length
  }, [images.length])

  const handlePick = async () => {
    const remaining = maxImages - images.length
    if (remaining <= 0) return

    const assets = await pickImages(remaining)
    if (!assets.length) return

    if (entityId) {
      setUploading(true)
      let failed = 0
      for (const asset of assets) {
        try {
          const result = await uploadImage(entityType, entityId, asset)
          onAdd({ id: result.id, uri: result.mediumUrl ?? result.thumbnailUrl ?? asset.uri })
        } catch (e: any) {
          failed++
          console.error('Upload failed:', e?.message)
        }
      }
      setUploading(false)
      if (failed > 0) {
        Alert.alert('Erreur', `${failed} photo${failed > 1 ? 's' : ''} n'ont pas pu etre ajoutee${failed > 1 ? 's' : ''}`)
      }
    } else {
      for (const asset of assets) {
        onAdd({ id: `local-${Date.now()}-${Math.random()}`, uri: asset.uri })
      }
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={images.length > 3}
    >
      <View className="flex-row gap-3 py-2">
        {images.map((img) => (
          <Pressable key={img.id} onPress={() => onRemove(img.id)}>
            <Image source={{ uri: img.uri }} className="h-24 w-24 rounded-card" />
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-destructive">
              <Text className="text-xs font-bold text-white">x</Text>
            </View>
          </Pressable>
        ))}
        {images.length < maxImages && (
          <Pressable
            className="h-24 w-24 items-center justify-center rounded-card border-2 border-dashed border-border"
            onPress={handlePick}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FF6B35" />
            ) : (
              <Text className="text-2xl text-muted-foreground">+</Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  )
}
