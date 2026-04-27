import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { ImageGallery } from '@/components/ImageGallery'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LISTING_TYPE_LABELS, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { ListingType, RoomType } from '@coloc/shared/constants'

import { Feather } from '@expo/vector-icons'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'
import { FavoriteButton } from '@/components/FavoriteButton'
import { getStatusMeta } from '@/components/CandidatureStatus'
import { ListingStatusBadge } from '@/components/ListingStatus'

const AMENITY_CONFIG: { key: string; icon: string; label: string }[] = [
  { key: 'privateBathroom', icon: 'droplet', label: 'Salle de bain\nprivée' },
  { key: 'privateToilets', icon: 'box', label: 'Toilettes\nprivées' },
  { key: 'pool', icon: 'sunset', label: 'Piscine' },
  { key: 'parking', icon: 'truck', label: 'Parking' },
  { key: 'airConditioning', icon: 'wind', label: 'Climatisation' },
  { key: 'petsAccepted', icon: 'heart', label: 'Animaux\nacceptés' },
]

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  const { data: listing, isLoading, error, refetch } = useQuery(
    orpc.listing.get.queryOptions({ input: { idOrSlug: id! } }),
  )

  // Fetch user's candidature for this listing.
  // Note: `id` from the URL can be a slug (when navigated from a card) or a UUID.
  // Match against the loaded listing's actual UUID once available.
  const { data: myCandidatures = [] } = useQuery({
    ...orpc.candidature.mine.queryOptions(),
    enabled: !!session,
  })
  const myCandidature = listing
    ? myCandidatures.find((c: any) => c.listingId === listing.id)
    : undefined

  const deleteM = useMutation({
    mutationFn: () => client.listing.delete({ id: listing!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
      queryClient.invalidateQueries({ queryKey: orpc.candidature.key() })
      queryClient.invalidateQueries({ queryKey: orpc.favorite.key() })
      router.back()
    },
  })


  if (isLoading) return (
    <View className="flex-1 items-center justify-center bg-background">
      <Pressable className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-white/80" style={{ top: insets.top + 4 }} onPress={() => router.back()}>
        <Feather name="chevron-left" size={22} color="#2D2A26" />
      </Pressable>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  )

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Pressable className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-white/80" style={{ top: insets.top + 4 }} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color="#2D2A26" />
        </Pressable>
        <Feather name="wifi-off" size={48} color="#E8DDD3" />
        <Text className="mt-4 text-center text-lg font-semibold text-foreground">Impossible de charger l'annonce</Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">Vérifiez votre connexion et réessayez</Text>
        <Pressable className="mt-6 rounded-button bg-primary px-6 py-3" accessibilityLabel="Réessayer" onPress={() => refetch()}>
          <Text className="text-base font-semibold text-primary-foreground">Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Pressable className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-white/80" style={{ top: insets.top + 4 }} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color="#2D2A26" />
        </Pressable>
        <Feather name="search" size={48} color="#E8DDD3" />
        <Text className="mt-4 text-center text-lg font-semibold text-foreground">Annonce introuvable</Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">Cette annonce a peut-être été supprimée</Text>
      </View>
    )
  }

  const isOwner = session?.user?.id === listing.authorId
  const images = listing.images ?? []
  const activeAmenities = AMENITY_CONFIG.filter((a) => (listing as any)[a.key])

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: insets.top }}>
      {/* Fullscreen Gallery Modal */}
      <ImageGallery
        visible={galleryOpen}
        images={images.map((img) => ({ uri: img.mediumUrl ?? '' }))}
        initialIndex={galleryIndex}
        onClose={() => setGalleryOpen(false)}
      />

      <View className="px-4 pt-2">
        {images.length > 0 ? (
          <Pressable className="overflow-hidden rounded-2xl" accessibilityLabel="Voir les photos en plein écran" onPress={() => { setGalleryIndex(0); setGalleryOpen(true) }}>
            {images.length === 1 ? (
              <Image source={{ uri: images[0].mediumUrl ?? '' }} style={{ width: '100%', height: 320 }} contentFit="cover" transition={200} accessibilityLabel={`Photo de ${listing.title}`} />
            ) : images.length === 2 ? (
              <View className="flex-row" style={{ height: 280 }}>
                <Image source={{ uri: images[0].mediumUrl ?? '' }} style={{ flex: 1, height: 280 }} contentFit="cover" transition={200} accessibilityLabel={`Photo 1 de ${listing.title}`} />
                <View style={{ width: 2 }} />
                <Image source={{ uri: images[1].mediumUrl ?? '' }} style={{ flex: 1, height: 280 }} contentFit="cover" transition={200} accessibilityLabel={`Photo 2 de ${listing.title}`} />
              </View>
            ) : (
              <View style={{ height: 280 }}>
                <Image source={{ uri: images[0].mediumUrl ?? '' }} style={{ width: '100%', height: 185 }} contentFit="cover" transition={200} accessibilityLabel={`Photo principale de ${listing.title}`} />
                <View className="flex-row" style={{ height: 93, marginTop: 2 }}>
                  {images.slice(1, 4).map((img, i) => (
                    <View key={img.id} style={{ flex: 1, marginLeft: i > 0 ? 2 : 0 }}>
                      <Image source={{ uri: img.mediumUrl ?? '' }} style={{ flex: 1 }} contentFit="cover" transition={200} />
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

            {images.length > 1 && (
              <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-pill bg-black/50 px-2.5 py-1" accessibilityElementsHidden>
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
        {/* Back + Favorite — always visible */}
        <Pressable
          className="absolute left-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white/80"
          onPress={() => router.back()}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <Feather name="chevron-left" size={22} color="#FF6B35" />
        </Pressable>
        {!isOwner && (
          <View className="absolute right-3 top-3">
            <FavoriteButton listingId={listing.id} />
          </View>
        )}
      </View>

      <View className="px-6 py-5 gap-6">
        {myCandidature && (() => {
          const meta = getStatusMeta(myCandidature.status)
          return (
            <Pressable
              className={`flex-row items-center gap-3 rounded-card p-3 ${meta.bannerBg}`}
              onPress={() => router.push(`/candidature/${myCandidature.id}` as any)}
              accessibilityRole="link"
              accessibilityLabel="Voir ma candidature"
            >
              <Feather name={meta.icon} size={18} color={meta.iconColor} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Tu as postulé</Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">{meta.longLabel}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#8B7E74" />
            </Pressable>
          )
        })()}

        <View>
          <View className="flex-row items-center gap-2">
            <View className="rounded-pill bg-accent px-3 py-1">
              <Text className="text-xs font-semibold text-accent-foreground">
                {LISTING_TYPE_LABELS[listing.listingType as ListingType]}
              </Text>
            </View>
            {listing.status !== 'published' && <ListingStatusBadge status={listing.status} />}
          </View>
          <Text className="mt-3 text-2xl font-bold text-foreground">{listing.title}</Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Feather name="map-pin" size={16} color="#0D9488" />
            <Text className="text-base text-muted-foreground">{listing.city}, {listing.regionLabel ?? listing.region}</Text>
          </View>
          <Text className="mt-2 text-xl font-bold text-primary">
            {listing.price.toLocaleString('fr-FR')} XPF / mois
          </Text>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 10 }} accessibilityLabel={`${ROOM_TYPE_LABELS[listing.roomType as RoomType]}, coloc à ${listing.roommateCount} personne(s), disponible ${new Date(listing.availableFrom).toLocaleDateString('fr-FR')}`}>
          <View className="items-center rounded-card bg-card p-3 shadow-sm" style={{ width: '31%' }}>
            <Feather name="home" size={22} color="#0D9488" />
            <Text className="mt-1.5 text-xs text-muted-foreground text-center">
              {ROOM_TYPE_LABELS[listing.roomType as RoomType]}
            </Text>
          </View>
          <View className="items-center rounded-card bg-card p-3 shadow-sm" style={{ width: '31%' }}>
            <Feather name="users" size={22} color="#0D9488" />
            <Text className="mt-1.5 text-xs text-muted-foreground text-center">
              Avec {listing.roommateCount} {listing.roommateCount > 1 ? 'colocs' : 'coloc'}
            </Text>
          </View>
          <View className="items-center rounded-card bg-card p-3 shadow-sm" style={{ width: '31%' }}>
            <Feather name="calendar" size={22} color="#0D9488" />
            <Text className="mt-1.5 text-xs text-muted-foreground text-center">
              {new Date(listing.availableFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {activeAmenities.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-muted-foreground uppercase">Équipements</Text>
            <View className="mt-3 flex-row flex-wrap" style={{ gap: 10 }}>
              {activeAmenities.map(({ key, icon, label }) => (
                <View key={key} className="items-center rounded-card bg-card p-3 shadow-sm" style={{ width: '31%' }}>
                  <Feather name={icon as any} size={24} color="#FF6B35" />
                  <Text className="mt-1.5 text-xs text-center text-muted-foreground">{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View>
          <Text className="text-sm font-semibold text-muted-foreground uppercase">À propos</Text>
          <Text className="mt-2 text-base leading-6 text-foreground">{listing.description}</Text>
        </View>

        <View className="rounded-card bg-card p-4 shadow-sm">
          <Text className="text-sm font-semibold text-muted-foreground uppercase">Annonceur</Text>
          <View className="mt-3 flex-row items-center gap-3">
            {listing.author && (
              <>
                <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <Text className="text-lg font-bold text-primary">
                    {listing.author.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-base font-semibold text-foreground">{listing.author.name}</Text>
              </>
            )}
          </View>
        </View>

        {session && !isOwner && (() => {
          if (!myCandidature) {
            return (
              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-3.5"
                accessibilityLabel="Postuler à cette annonce"
                onPress={() => router.push(`/listing/apply/${listing.id}` as any)}
              >
                <Feather name="send" size={18} color="#fff" />
                <Text className="text-base font-semibold text-primary-foreground">Postuler</Text>
              </Pressable>
            )
          }
          if (myCandidature.status === 'pending') {
            return (
              <View className="items-center rounded-button bg-accent py-3.5">
                <Text className="text-base font-semibold text-accent-foreground">Candidature envoyée ⏳</Text>
              </View>
            )
          }
          if (myCandidature.status === 'accepted' || myCandidature.status === 'finalized') {
            return (
              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-button bg-secondary py-3.5"
                accessibilityLabel="Voir le contact"
                onPress={() => router.push(`/candidature/${myCandidature.id}` as any)}
              >
                <Feather name="phone" size={18} color="#fff" />
                <Text className="text-base font-semibold text-secondary-foreground">Voir le contact</Text>
              </Pressable>
            )
          }
          if (myCandidature.status === 'rejected') {
            return (
              <View className="items-center rounded-button bg-muted py-3.5">
                <Text className="text-base font-medium text-muted-foreground">Candidature non retenue</Text>
              </View>
            )
          }
          return null
        })()}

        {isOwner && (
          <View className="gap-3 pb-8">
            <Pressable className="items-center rounded-button bg-primary py-3.5" accessibilityLabel="Modifier l'annonce" onPress={() => router.push(`/listing/edit/${listing.id}` as any)}>
              <Text className="text-base font-semibold text-primary-foreground">Modifier</Text>
            </Pressable>
            <Pressable
              className={`items-center rounded-button border border-destructive py-3.5 ${deleteM.isPending ? 'opacity-50' : ''}`}
              accessibilityLabel="Supprimer l'annonce"
              disabled={deleteM.isPending}
              onPress={() => Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer cette annonce ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => deleteM.mutate() },
              ])}
            >
              {deleteM.isPending ? <ActivityIndicator color="#EF4444" /> : <Text className="text-base font-semibold text-destructive">Supprimer</Text>}
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  )
}
