import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StatusBar, Text, View, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DURATION_LABELS, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, RoomType } from '@coloc/shared/constants'

import { Feather } from '@expo/vector-icons'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'

const AMENITY_CONFIG: { key: string; icon: string; label: string }[] = [
  { key: 'privateBathroom', icon: 'droplet', label: 'Salle de bain\nprivee' },
  { key: 'privateToilets', icon: 'box', label: 'Toilettes\nprivees' },
  { key: 'pool', icon: 'sunset', label: 'Piscine' },
  { key: 'parking', icon: 'truck', label: 'Parking' },
  { key: 'airConditioning', icon: 'wind', label: 'Climatisation' },
  { key: 'petsAccepted', icon: 'heart', label: 'Animaux\nacceptes' },
]

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  const { data: listing, isLoading } = useQuery(
    orpc.listing.get.queryOptions({ input: { idOrSlug: id! } }),
  )

  const deleteM = useMutation({
    mutationFn: () => client.listing.delete({ id: listing!.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: orpc.listing.key() }); router.back() },
  })

  const { data: favData } = useQuery({
    ...orpc.favorite.check.queryOptions({ input: { listingId: id! } }),
    enabled: !!id && !!session,
  })

  const toggleFav = useMutation({
    mutationFn: () => client.favorite.toggle({ listingId: listing!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.favorite.key() })
    },
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>
  if (!listing) return <View className="flex-1 items-center justify-center bg-background"><Text className="text-muted-foreground">Annonce introuvable</Text></View>

  const isOwner = session?.user?.id === listing.authorId
  const isFavorited = favData?.favorited ?? false
  const images = listing.images ?? []
  const activeAmenities = AMENITY_CONFIG.filter((a) => (listing as any)[a.key])

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Image Gallery */}
      {/* Fullscreen Gallery Modal */}
      <Modal visible={galleryOpen} animationType="fade" statusBarTranslucent>
        <View className="flex-1 bg-black">
          <StatusBar barStyle="light-content" />
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: galleryIndex * width, y: 0 }}
            onMomentumScrollEnd={(e) => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {images.map((img) => (
              <View key={img.id} className="flex-1 items-center justify-center" style={{ width }}>
                <Image source={{ uri: img.mediumUrl ?? '' }} style={{ width, flex: 1 }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          <Pressable className="absolute right-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-white/20" onPress={() => setGalleryOpen(false)}>
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
          {images.length > 1 && (
            <View className="absolute bottom-10 w-full items-center">
              <Text className="text-sm font-medium text-white">{galleryIndex + 1} / {images.length}</Text>
            </View>
          )}
        </View>
      </Modal>

      <View className="px-4 pt-2">
        {images.length > 0 ? (
          <Pressable className="overflow-hidden rounded-2xl" onPress={() => { setGalleryIndex(0); setGalleryOpen(true) }}>
            {images.length === 1 ? (
              <Image source={{ uri: images[0].mediumUrl ?? '' }} className="w-full" style={{ height: 320 }} resizeMode="cover" />
            ) : images.length === 2 ? (
              <View className="flex-row" style={{ height: 280 }}>
                <Image source={{ uri: images[0].mediumUrl ?? '' }} className="flex-1" style={{ height: 280 }} resizeMode="cover" />
                <View style={{ width: 2 }} />
                <Image source={{ uri: images[1].mediumUrl ?? '' }} className="flex-1" style={{ height: 280 }} resizeMode="cover" />
              </View>
            ) : (
              <View style={{ height: 280 }}>
                <Image source={{ uri: images[0].mediumUrl ?? '' }} className="w-full" style={{ height: 185 }} resizeMode="cover" />
                <View className="flex-row" style={{ height: 93, marginTop: 2 }}>
                  {images.slice(1, 4).map((img, i) => (
                    <View key={img.id} style={{ flex: 1, marginLeft: i > 0 ? 2 : 0 }}>
                      <Image source={{ uri: img.mediumUrl ?? '' }} style={{ flex: 1 }} resizeMode="cover" />
                      {i === 2 && images.length > 4 && (
                        <View className="absolute inset-0 items-center justify-center bg-black/40">
                          <Text className="text-lg font-bold text-white">+{images.length - 4}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Overlays */}
            <View className="absolute left-3 top-3 rounded-pill bg-primary px-3.5 py-1.5">
              <Text className="text-sm font-bold text-primary-foreground">
                {listing.price.toLocaleString('fr-FR')} XPF / mois
              </Text>
            </View>
            {session && !isOwner && (
              <Pressable className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white/80" onPress={() => toggleFav.mutate()}>
                <Feather name="heart" size={20} color={isFavorited ? '#FF6B35' : '#8B7E74'} />
              </Pressable>
            )}
            {images.length > 1 && (
              <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-pill bg-black/50 px-2.5 py-1">
                <Feather name="image" size={12} color="#fff" />
                <Text className="text-xs font-medium text-white">{images.length}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View className="h-48 items-center justify-center rounded-2xl bg-muted">
            <Feather name="image" size={48} color="#E8DDD3" />
            <Text className="mt-2 text-sm text-muted-foreground">Pas de photos</Text>
          </View>
        )}
      </View>

      <View className="px-6 py-5 gap-6">
        {/* Header */}
        <View>
          <View className="flex-row items-center gap-2">
            <View className="rounded-pill bg-accent px-3 py-1">
              <Text className="text-xs font-semibold text-accent-foreground">
                {DURATION_LABELS[listing.durationType as DurationType]}
              </Text>
            </View>
            {listing.status === 'draft' && (
              <View className="rounded-pill bg-muted px-3 py-1">
                <Text className="text-xs font-semibold text-muted-foreground">Brouillon</Text>
              </View>
            )}
          </View>
          <Text className="mt-3 text-2xl font-bold text-foreground">{listing.title}</Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Feather name="map-pin" size={16} color="#0D9488" />
            <Text className="text-base text-muted-foreground">{listing.commune}, {listing.island}</Text>
          </View>
        </View>

        {/* Quick Info */}
        <View className="flex-row gap-3">
          <View className="flex-1 items-center rounded-card bg-card p-3 shadow-sm">
            <Feather name="home" size={22} color="#0D9488" />
            <Text className="mt-1.5 text-xs text-muted-foreground text-center">
              {ROOM_TYPE_LABELS[listing.roomType as RoomType]}
            </Text>
          </View>
          <View className="flex-1 items-center rounded-card bg-card p-3 shadow-sm">
            <Feather name="users" size={22} color="#0D9488" />
            <Text className="mt-1.5 text-xs text-muted-foreground text-center">
              {listing.numberOfPeople} {listing.numberOfPeople > 1 ? 'personnes' : 'personne'}
            </Text>
          </View>
          <View className="flex-1 items-center rounded-card bg-card p-3 shadow-sm">
            <Feather name="calendar" size={22} color="#0D9488" />
            <Text className="mt-1.5 text-xs text-muted-foreground text-center">
              {new Date(listing.availableFrom).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Amenities Grid */}
        <View>
          <Text className="text-sm font-semibold text-muted-foreground uppercase">Equipements</Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            {activeAmenities.map(({ key, icon, label }) => (
              <View key={key} className="items-center rounded-card bg-card p-3 shadow-sm" style={{ width: (width - 60) / 3 }}>
                <Feather name={icon as any} size={24} color="#FF6B35" />
                <Text className="mt-1.5 text-xs text-center text-muted-foreground">{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Description */}
        <View>
          <Text className="text-sm font-semibold text-muted-foreground uppercase">A propos</Text>
          <Text className="mt-2 text-base leading-6 text-foreground">{listing.description}</Text>
        </View>

        {/* Contact Card */}
        <View className="rounded-card bg-card p-4 shadow-sm">
          <Text className="text-sm font-semibold text-muted-foreground uppercase">Contact</Text>
          <View className="mt-3 flex-row items-center gap-3">
            {listing.author && (
              <>
                <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <Text className="text-lg font-bold text-primary">
                    {listing.author.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">{listing.author.name}</Text>
                  {listing.contactEmail && (
                    <Text className="text-sm text-muted-foreground">{listing.contactEmail}</Text>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Contact Action */}
        {session && !isOwner && (
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-button bg-secondary py-3.5"
            onPress={async () => {
              const conv = await client.chat.getOrCreate({ listingId: listing.id })
              router.push(`/chat/${conv.id}` as any)
            }}
          >
            <Feather name="message-circle" size={18} color="#fff" />
            <Text className="text-base font-semibold text-secondary-foreground">Contacter</Text>
          </Pressable>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <View className="gap-3 pb-8">
            <Pressable className="items-center rounded-button bg-primary py-3.5" onPress={() => router.push(`/listing/edit/${listing.id}` as any)}>
              <Text className="text-base font-semibold text-primary-foreground">Modifier</Text>
            </Pressable>
            <Pressable
              className="items-center rounded-button border border-destructive py-3.5"
              onPress={() => Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer cette annonce ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => deleteM.mutate() },
              ])}
            >
              <Text className="text-base font-semibold text-destructive">Supprimer</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
