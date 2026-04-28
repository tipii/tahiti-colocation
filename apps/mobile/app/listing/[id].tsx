import { useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { ImageGallery } from '@/components/ImageGallery'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LISTING_TYPE_LABELS, ROOM_TYPE_LABELS, HOUSING_TYPE_LABELS } from '@coloc/shared/constants'
import type { ListingType, RoomType, HousingType } from '@coloc/shared/constants'

import { Feather } from '@expo/vector-icons'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'
import { FavoriteButton } from '@/components/FavoriteButton'
import { getStatusMeta } from '@/components/CandidatureStatus'
import { ListingStatusBadge } from '@/components/ListingStatus'
import { ListingMap } from '@/components/ListingMap'
import { colocLabel } from '@/components/ListingCard'

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const { data: listing, isLoading, error, refetch } = useQuery(
    orpc.listing.get.queryOptions({ input: { idOrSlug: id! } }),
  )

  const { data: amenityCatalog = [] } = useQuery(orpc.meta.amenities.queryOptions({
    staleTime: 60 * 60 * 1000,
  }))

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
  const listingAmenities = (listing.amenities ?? []) as string[]
  const activeAmenities = amenityCatalog.filter((a) => listingAmenities.includes(a.code))

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top,
          // Reserve space so the sticky footer (when present) doesn't cover content.
          paddingBottom: !isOwner && session ? 100 + insets.bottom : 0,
        }}
      >
      {/* Fullscreen Gallery Modal */}
      <ImageGallery
        visible={galleryOpen}
        images={images.map((img) => ({ uri: img.mediumUrl ?? '' }))}
        initialIndex={galleryIndex}
        onClose={() => setGalleryOpen(false)}
      />

      <View>
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              keyExtractor={(img) => img.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setCarouselIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }}
              renderItem={({ item, index }) => (
                <Pressable
                  style={{ width, height: 320 }}
                  accessibilityLabel={`Photo ${index + 1} sur ${images.length}`}
                  onPress={() => { setGalleryIndex(index); setGalleryOpen(true) }}
                >
                  <Image
                    source={{ uri: item.mediumUrl ?? '' }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                </Pressable>
              )}
            />

            {images.length > 1 && (
              <>
                <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5" accessibilityElementsHidden>
                  {images.map((_, i) => (
                    <View
                      key={i}
                      className={`h-1.5 rounded-full ${carouselIndex === i ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                    />
                  ))}
                </View>
                <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-pill bg-black/50 px-2.5 py-1">
                  <Feather name="image" size={12} color="#fff" />
                  <Text className="text-xs font-medium text-white">{carouselIndex + 1}/{images.length}</Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <View className="h-48 items-center justify-center bg-muted">
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
          <View className="flex-row items-center gap-1.5">
            <View className="rounded-pill bg-accent px-3 py-1">
              <Text className="text-xs font-semibold text-accent-foreground">
                {LISTING_TYPE_LABELS[listing.listingType as ListingType]}
              </Text>
            </View>
            <View className="rounded-pill bg-secondary/15 px-3 py-1">
              <Text className="text-xs font-semibold text-secondary">
                {HOUSING_TYPE_LABELS[listing.housingType as HousingType]}
              </Text>
            </View>
            {listing.status !== 'published' && <ListingStatusBadge status={listing.status} />}
          </View>
          <Text className="mt-3 text-2xl font-bold text-foreground">{listing.title}</Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Feather name="map-pin" size={16} color="#0D9488" />
            <Text className="text-base text-muted-foreground">{listing.cityLabel ?? listing.city}, {listing.regionLabel ?? listing.region}</Text>
          </View>
          <Text className="mt-2 text-2xl font-bold text-primary">
            {listing.price.toLocaleString('fr-FR')} XPF / mois
          </Text>

          {/* Property facts — accent pills, same palette as the amenity tiles */}
          <View className="mt-3 flex-row flex-wrap gap-2">
            <View className="flex-row items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5">
              <Feather name="home" size={14} color="#FF6B35" />
              <Text className="text-sm text-accent-foreground">
                {colocLabel(listing.roommateCount, listing.roomType as RoomType)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5">
              <Feather name="users" size={14} color="#FF6B35" />
              <Text className="text-sm text-accent-foreground">{ROOM_TYPE_LABELS[listing.roomType as RoomType]}</Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5">
              <Feather name="calendar" size={14} color="#FF6B35" />
              <Text className="text-sm text-accent-foreground">
                Dès le {new Date(listing.availableFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text className="text-sm font-semibold text-muted-foreground uppercase">À propos</Text>
          <Text className="mt-2 text-base leading-6 text-foreground">{listing.description}</Text>
        </View>

        {/* Annonceur — moved up; trust signals (member since, posted date) */}
        {listing.author && (
          <View className="rounded-card bg-card p-4 shadow-sm">
            <Text className="text-sm font-semibold text-muted-foreground uppercase">Annonceur</Text>
            <View className="mt-3 flex-row items-center gap-3">
              {listing.author.avatar ? (
                <Image source={{ uri: listing.author.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <Text className="text-lg font-bold text-primary">{listing.author.name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{listing.author.name}</Text>
                {listing.author.createdAt && (
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    Membre depuis {new Date(listing.author.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </Text>
                )}
              </View>
            </View>
            <Text className="mt-3 text-xs text-muted-foreground">
              Annonce publiée {(() => {
                const days = Math.max(0, Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
                if (days === 0) return "aujourd'hui"
                if (days === 1) return 'hier'
                if (days < 30) return `il y a ${days} jours`
                const months = Math.floor(days / 30)
                if (months < 12) return `il y a ${months} mois`
                return `il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}`
              })()}
            </Text>
          </View>
        )}

        {activeAmenities.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-muted-foreground uppercase">Équipements</Text>
            <View className="mt-3 flex-row flex-wrap" style={{ gap: 10 }}>
              {activeAmenities.map((a) => (
                <View key={a.code} className="items-center rounded-card bg-accent p-3" style={{ width: '31%' }}>
                  <Feather name={a.icon as any} size={26} color="#FF6B35" />
                  <Text className="mt-1.5 text-xs text-center text-accent-foreground">{a.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {listing.latitude && listing.longitude && (
          <View>
            <Text className="text-sm font-semibold text-muted-foreground uppercase">Localisation</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Position approximative · {listing.cityLabel ?? listing.city}, {listing.regionLabel ?? listing.region}
            </Text>
            <View className="mt-3">
              <ListingMap latitude={Number(listing.latitude)} longitude={Number(listing.longitude)} />
            </View>
          </View>
        )}

        {/* Non-owner CTA lives in the sticky bottom bar (rendered outside the ScrollView). */}

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

    {/* Sticky bottom CTA — non-owner seekers only. Mirrors the inline body
        button's status-aware behaviour (Postuler / envoyée / Voir le contact / non retenue). */}
    {session && !isOwner && (
      <View
        style={{ paddingBottom: insets.bottom + 12, backgroundColor: '#FFFFFF', borderTopColor: '#E8DDD3' }}
        className="absolute bottom-0 left-0 right-0 flex-row items-center gap-3 border-t px-6 pt-3"
      >
        {(() => {
          // Status meta drives both the left "reassurance" cell and the right
          // action. Bar layout: [icon · text/sub] [CTA pill].
          type Meta = {
            iconName: keyof typeof Feather.glyphMap
            iconColor: string
            iconBg: string
            text: string
            sub?: string
            cta: { label: string; bg: string; iconName: keyof typeof Feather.glyphMap; onPress?: () => void } | null
          }
          let m: Meta
          if (!myCandidature) {
            m = {
              iconName: 'send', iconColor: '#FF6B35', iconBg: 'bg-accent',
              text: 'Tu aimes cette annonce ?', sub: "Présente-toi à l'annonceur",
              cta: { label: 'Postuler', bg: 'bg-primary', iconName: 'send', onPress: () => router.push(`/listing/apply/${listing.id}` as any) },
            }
          } else if (myCandidature.status === 'pending') {
            m = {
              iconName: 'clock', iconColor: '#FF6B35', iconBg: 'bg-accent',
              text: 'Candidature envoyée', sub: "L'annonceur va te répondre",
              cta: null,
            }
          } else if (myCandidature.status === 'accepted' || myCandidature.status === 'finalized') {
            m = {
              iconName: 'check-circle', iconColor: '#0D9488', iconBg: 'bg-secondary/15',
              text: "Tu as été accepté·e 🌺", sub: 'Récupère le contact',
              cta: { label: 'Voir le contact', bg: 'bg-secondary', iconName: 'phone', onPress: () => router.push(`/candidature/${myCandidature.id}` as any) },
            }
          } else {
            // rejected / withdrawn
            m = {
              iconName: 'x-circle', iconColor: '#8B7E74', iconBg: 'bg-muted',
              text: 'Candidature non retenue', sub: "D'autres annonces t'attendent",
              cta: null,
            }
          }
          return (
            <>
              <View className="flex-1 flex-row items-center gap-3">
                <View className={`h-10 w-10 items-center justify-center rounded-full ${m.iconBg}`}>
                  <Feather name={m.iconName} size={18} color={m.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{m.text}</Text>
                  {m.sub && <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>{m.sub}</Text>}
                </View>
              </View>
              {m.cta && (
                <Pressable
                  className={`flex-row items-center gap-2 rounded-pill px-5 py-3 ${m.cta.bg}`}
                  accessibilityLabel={m.cta.label}
                  onPress={m.cta.onPress}
                >
                  <Feather name={m.cta.iconName} size={16} color="#fff" />
                  <Text className="text-sm font-semibold text-primary-foreground">{m.cta.label}</Text>
                </Pressable>
              )}
            </>
          )
        })()}
      </View>
    )}
    </View>
  )
}
