import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LISTING_TYPES, LISTING_TYPE_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS, DEFAULT_COUNTRY } from '@coloc/shared/constants'
import type { ListingType, RoomType } from '@coloc/shared/constants'

import * as Haptics from 'expo-haptics'
import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'
import { uploadImage } from '@/lib/upload'
import { DateField } from '@/components/DateField'
import { ImagePickerGrid } from '@/components/ImagePickerGrid'
import { MapPicker } from '@/components/MapPicker'

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-6 mb-2 text-sm font-semibold text-muted-foreground uppercase">{children}</Text>
}

export default function CreateListingScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [photos, setPhotos] = useState<{ id: string; uri: string }[]>([])

  const { data: profile } = useQuery(orpc.user.me.queryOptions())
  const emailVerified = !!profile?.emailVerified

  // Lifted region state so the cities query refetches as the user picks chips.
  // Form value is kept in sync via the chip onPress.
  const [selectedRegion, setSelectedRegion] = useState<string>('tahiti')

  const { data: regionOptions = [] } = useQuery(orpc.geo.regions.queryOptions({
    input: { country: DEFAULT_COUNTRY },
    staleTime: 60 * 60 * 1000,
  }))

  const { data: cityOptions = [] } = useQuery(orpc.geo.cities.queryOptions({
    input: { country: DEFAULT_COUNTRY, region: selectedRegion },
    staleTime: 60 * 60 * 1000,
  }))

  const { data: amenityCatalog = [] } = useQuery(orpc.meta.amenities.queryOptions({
    staleTime: 60 * 60 * 1000,
  }))

  // Listing coordinates — provider places the pin in the embedded map below.
  // Initialised to the default city's centroid, then updated by city chip
  // taps and by map-picker taps.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const resendM = useMutation({
    mutationFn: () => authClient.sendVerificationEmail({ email: profile!.email }),
    onSuccess: () => Alert.alert('Email envoyé', 'Vérifie ta boîte mail (et le dossier spam).'),
    onError: () => Alert.alert('Erreur', "Impossible de renvoyer l'email"),
  })

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      price: '',
      listingType: 'colocation' as ListingType,
      availableFrom: '',
      availableTo: '',
      region: 'tahiti',
      city: 'papeete',
      roomType: 'single' as RoomType,
      roommateCount: '1',
      amenities: [] as string[],
    },
  })

  useEffect(() => {
    if (coords) return
    const city = cityOptions.find((c) => c.code === form.state.values.city)
    if (city) setCoords({ lat: Number(city.latitude), lng: Number(city.longitude) })
  }, [coords, cityOptions, form])

  const submitMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const v = form.state.values
      const res = await client.listing.create({
        title: v.title,
        description: v.description,
        price: Number(v.price),
        listingType: v.listingType,
        availableFrom: new Date(v.availableFrom),
        availableTo: v.availableTo ? new Date(v.availableTo) : null,
        region: v.region,
        city: v.city,
        roomType: v.roomType,
        roommateCount: Number(v.roommateCount),
        amenities: v.amenities,
        latitude: coords ? coords.lat.toFixed(6) : null,
        longitude: coords ? coords.lng.toFixed(6) : null,
        status: publish ? 'published' : 'draft',
      })

      for (const photo of photos.filter((p) => p.id.startsWith('local-'))) {
        try {
          await uploadImage('listing', res.id, { uri: photo.uri, mimeType: 'image/jpeg' } as any)
        } catch (e) {
          console.error('Failed to upload photo:', e)
        }
      }

      if (publish) await client.listing.publish({ id: res.id })
      return publish
    },
    onSuccess: (published) => {
      queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
      Alert.alert('Succes', published ? 'Annonce publiee !' : 'Brouillon enregistre')
      router.replace('/(tabs)')
    },
    onError: () => Alert.alert('Erreur', "Impossible de creer l'annonce"),
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleSubmit = (publish: boolean) => {
    const v = form.state.values
    const errors: string[] = []
    if (!v.title) errors.push('Titre')
    if (!v.description) errors.push('Description')
    if (!v.price) errors.push('Prix')
    if (!v.city) errors.push('Commune')
    if (!v.availableFrom) errors.push('Date de disponibilité')
    setValidationErrors(errors)
    if (errors.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    submitMutation.mutate(publish)
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
          <Text className="text-3xl font-bold text-foreground">Nouvelle annonce</Text>

          {!emailVerified && profile && (
            <View className="mt-4 rounded-card bg-accent/40 p-4">
              <Text className="text-sm font-semibold text-foreground">Confirme ton email</Text>
              <Text className="mt-1 text-sm text-muted-foreground">Tu dois confirmer {profile.email} avant de publier une annonce.</Text>
              <Pressable className="mt-3 items-center rounded-button bg-primary py-2.5" onPress={() => resendM.mutate()} disabled={resendM.isPending}>
                <Text className="text-sm font-semibold text-primary-foreground">{resendM.isPending ? 'Envoi…' : "Renvoyer l'email"}</Text>
              </Pressable>
            </View>
          )}

          {/* Photos */}
          <SectionTitle>Photos</SectionTitle>
          <ImagePickerGrid
            images={photos}
            onAdd={(img) => setPhotos((p) => [...p, img])}
            onRemove={(id) => setPhotos((p) => p.filter((i) => i.id !== id))}
            entityType="listing"
          />

          {/* General */}
          <SectionTitle>Informations generales</SectionTitle>
          <form.Field name="title">
            {(f) => (
              <TextInput className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" placeholder="Titre de l'annonce" placeholderTextColor="#8B7E74" value={f.state.value} onChangeText={f.handleChange} />
            )}
          </form.Field>
          <form.Field name="description">
            {(f) => (
              <TextInput className="mt-3 rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" placeholder="Description" placeholderTextColor="#8B7E74" multiline textAlignVertical="top" style={{ minHeight: 100 }} value={f.state.value} onChangeText={f.handleChange} />
            )}
          </form.Field>
          <form.Field name="price">
            {(f) => (
              <View className="mt-3 flex-row items-center gap-2">
                <TextInput className="flex-1 rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" placeholder="Prix" placeholderTextColor="#8B7E74" keyboardType="numeric" value={f.state.value} onChangeText={f.handleChange} />
                <Text className="text-base text-muted-foreground">XPF/mois</Text>
              </View>
            )}
          </form.Field>

          {/* Duration */}
          <SectionTitle>Duree</SectionTitle>
          <form.Field name="listingType">
            {(f) => (
              <View className="flex-row gap-2">
                {LISTING_TYPES.map((dt) => (
                  <Pressable key={dt} className={`flex-1 items-center rounded-button py-2.5 ${f.state.value === dt ? 'bg-primary' : 'bg-muted'}`} onPress={() => f.handleChange(dt)}>
                    <Text className={`text-sm font-medium ${f.state.value === dt ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{LISTING_TYPE_LABELS[dt]}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </form.Field>
          <form.Field name="availableFrom">
            {(f) => <DateField label="Disponible a partir du" value={f.state.value} onChange={f.handleChange} />}
          </form.Field>
          <form.Field name="availableTo">
            {(f) => <DateField label="Jusqu'au (optionnel)" value={f.state.value} onChange={f.handleChange} placeholder="Pas de date de fin" />}
          </form.Field>

          {/* Location */}
          <SectionTitle>Localisation</SectionTitle>
          <Text className="mb-1.5 text-xs font-medium text-muted-foreground">Île</Text>
          <form.Field name="region">
            {(f) => (
              <View className="flex-row flex-wrap gap-2">
                {regionOptions.map((r) => (
                  <Pressable
                    key={r.code}
                    className={`rounded-pill px-4 py-2 ${f.state.value === r.code ? 'bg-primary' : 'bg-muted'}`}
                    onPress={() => {
                      f.handleChange(r.code)
                      setSelectedRegion(r.code)
                      // Reset city — it likely doesn't belong to the new region.
                      form.setFieldValue('city', '')
                    }}
                  >
                    <Text className={`text-sm ${f.state.value === r.code ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </form.Field>
          <Text className="mb-1.5 mt-3 text-xs font-medium text-muted-foreground">Commune</Text>
          <form.Field name="city">
            {(f) => (
              <View className="flex-row flex-wrap gap-2">
                {cityOptions.map((c) => (
                  <Pressable
                    key={c.code}
                    className={`rounded-pill px-4 py-2 ${f.state.value === c.code ? 'bg-primary' : 'bg-muted'}`}
                    onPress={() => {
                      f.handleChange(c.code)
                      setCoords({ lat: Number(c.latitude), lng: Number(c.longitude) })
                    }}
                  >
                    <Text className={`text-sm ${f.state.value === c.code ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </form.Field>

          {coords && (
            <>
              <Text className="mb-1.5 mt-4 text-xs font-medium text-muted-foreground">Position sur la carte</Text>
              <MapPicker
                initialLat={coords.lat}
                initialLng={coords.lng}
                onChange={(lat, lng) => setCoords({ lat, lng })}
              />
            </>
          )}

          {/* Room */}
          <SectionTitle>Logement</SectionTitle>
          <form.Field name="roomType">
            {(f) => (
              <View className="flex-row gap-2">
                {ROOM_TYPES.map((rt) => (
                  <Pressable key={rt} className={`flex-1 items-center rounded-button py-2.5 ${f.state.value === rt ? 'bg-secondary' : 'bg-muted'}`} onPress={() => f.handleChange(rt)}>
                    <Text className={`text-sm font-medium ${f.state.value === rt ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>{ROOM_TYPE_LABELS[rt]}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </form.Field>
          <form.Field name="roommateCount">
            {(f) => (
              <View className="mt-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base text-foreground">Colocataires actuels:</Text>
                  <TextInput className="w-16 rounded-input border border-border bg-card px-3 py-2 text-center text-base text-foreground" keyboardType="numeric" value={f.state.value} onChangeText={f.handleChange} />
                </View>
                <Text className="mt-1 text-xs text-muted-foreground">Vous non compris</Text>
              </View>
            )}
          </form.Field>

          {/* Amenities */}
          <SectionTitle>Equipements</SectionTitle>
          <form.Field name="amenities">
            {(f) => (
              <View className="flex-row flex-wrap gap-2">
                {amenityCatalog.map((a) => {
                  const active = f.state.value.includes(a.code)
                  return (
                    <Pressable
                      key={a.code}
                      className={`flex-row items-center gap-1.5 rounded-pill px-3.5 py-2 ${active ? 'bg-primary' : 'bg-muted'}`}
                      onPress={() => {
                        Haptics.selectionAsync()
                        f.handleChange(active ? f.state.value.filter((c) => c !== a.code) : [...f.state.value, a.code])
                      }}
                    >
                      <Feather name={a.icon as any} size={13} color={active ? '#fff' : '#8B7E74'} />
                      <Text className={`text-sm ${active ? 'text-primary-foreground' : 'text-foreground'}`}>{a.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </form.Field>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <View className="mt-6 rounded-card bg-destructive/10 p-4">
              <Text className="text-sm font-semibold text-destructive">Champs obligatoires manquants :</Text>
              <Text className="mt-1 text-sm text-destructive">{validationErrors.join(', ')}</Text>
            </View>
          )}

          {/* Submit */}
          <View className="mt-8 gap-3 pb-8">
            <Pressable
              className={`items-center rounded-button bg-primary py-3.5 ${submitMutation.isPending ? 'opacity-50' : ''}`}
              onPress={() => handleSubmit(true)}
              disabled={submitMutation.isPending}
              accessibilityLabel="Publier l'annonce"
              accessibilityRole="button"
            >
              {submitMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-semibold text-primary-foreground">Publier</Text>}
            </Pressable>
            <Pressable
              className={`items-center rounded-button border border-border py-3.5 ${submitMutation.isPending ? 'opacity-50' : ''}`}
              onPress={() => handleSubmit(false)}
              disabled={submitMutation.isPending}
              accessibilityLabel="Enregistrer comme brouillon"
              accessibilityRole="button"
            >
              <Text className="text-base font-medium text-muted-foreground">Enregistrer en brouillon</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
