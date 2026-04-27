import { useState } from 'react'
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useForm } from '@tanstack/react-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LISTING_TYPES, LISTING_TYPE_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS, DEFAULT_COUNTRY } from '@coloc/shared/constants'
import type { ListingType, RoomType } from '@coloc/shared/constants'
import type { Image as ImageType } from '@coloc/shared/types'

import { orpc, client } from '@/lib/orpc'
import { apiFetch } from '@/lib/api'
import { DateField } from '@/components/DateField'
import { ImagePickerGrid } from '@/components/ImagePickerGrid'

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-6 mb-2 text-sm font-semibold text-muted-foreground uppercase">{children}</Text>
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [existingImages, setExistingImages] = useState<ImageType[]>([])
  const [initialized, setInitialized] = useState(false)

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      price: '',
      listingType: 'colocation' as ListingType,
      availableFrom: '',
      availableTo: '',
      region: 'tahiti',
      city: '',
      roomType: 'single' as RoomType,
      roommateCount: '1',
      privateBathroom: false,
      privateToilets: false,
      pool: false,
      parking: false,
      airConditioning: false,
      petsAccepted: false,
      status: 'draft' as string,
    },
  })

  const [selectedRegion, setSelectedRegion] = useState<string>('tahiti')

  const { data: regionOptions = [] } = useQuery(orpc.geo.regions.queryOptions({
    input: { country: DEFAULT_COUNTRY },
    staleTime: 60 * 60 * 1000,
  }))

  const { data: cityOptions = [] } = useQuery(orpc.geo.cities.queryOptions({
    input: { country: DEFAULT_COUNTRY, region: selectedRegion },
    staleTime: 60 * 60 * 1000,
  }))

  const { isLoading } = useQuery({
    ...orpc.listing.get.queryOptions({ input: { idOrSlug: id! } }),
    enabled: !!id,
    select: (l: any) => {
      if (!initialized) {
        form.setFieldValue('title', l.title)
        form.setFieldValue('description', l.description)
        form.setFieldValue('price', String(l.price))
        form.setFieldValue('listingType', l.listingType)
        form.setFieldValue('availableFrom', new Date(l.availableFrom).toISOString().split('T')[0])
        form.setFieldValue('availableTo', l.availableTo ? new Date(l.availableTo).toISOString().split('T')[0] : '')
        form.setFieldValue('region', l.region)
        setSelectedRegion(l.region)
        form.setFieldValue('city', l.city)
        form.setFieldValue('roomType', l.roomType)
        form.setFieldValue('roommateCount', String(l.roommateCount))
        form.setFieldValue('privateBathroom', l.privateBathroom)
        form.setFieldValue('privateToilets', l.privateToilets)
        form.setFieldValue('pool', l.pool)
        form.setFieldValue('parking', l.parking)
        form.setFieldValue('airConditioning', l.airConditioning)
        form.setFieldValue('petsAccepted', l.petsAccepted)
        form.setFieldValue('status', l.status)
        setExistingImages(l.images ?? [])
        setInitialized(true)
      }
      return l
    },
  })

  const handleRemoveImage = async (imageId: string) => {
    try {
      await apiFetch(`/api/images/${imageId}`, { method: 'DELETE' })
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch { Alert.alert('Erreur', 'Impossible de supprimer la photo') }
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
    router.back()
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const v = form.state.values
      return client.listing.update({
        id: id!, title: v.title, description: v.description, price: Number(v.price),
        listingType: v.listingType, availableFrom: new Date(v.availableFrom),
        availableTo: v.availableTo ? new Date(v.availableTo) : null,
        region: v.region, city: v.city, roomType: v.roomType,
        roommateCount: Number(v.roommateCount),
        privateBathroom: v.privateBathroom, privateToilets: v.privateToilets,
        pool: v.pool, parking: v.parking, airConditioning: v.airConditioning,
        petsAccepted: v.petsAccepted,
      })
    },
    onSuccess: () => { Alert.alert('Succes', 'Annonce mise a jour'); invalidate() },
    onError: () => Alert.alert('Erreur', 'Impossible de mettre a jour'),
  })

  const publishMutation = useMutation({
    mutationFn: () => client.listing.publish({ id: id! }),
    onSuccess: () => { Alert.alert('Succes', 'Annonce publiee !'); invalidate() },
    onError: () => Alert.alert('Erreur', 'Impossible de publier'),
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  const isPending = saveMutation.isPending || publishMutation.isPending

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-6 pb-8">
          {/* Photos */}
          <SectionTitle>Photos</SectionTitle>
          <ImagePickerGrid
            images={existingImages.map((img) => ({ id: img.id, uri: img.thumbnailUrl ?? img.mediumUrl ?? '' }))}
            onAdd={(img) => setExistingImages((prev) => [...prev, { id: img.id, originalUrl: img.uri, mediumUrl: img.uri, thumbnailUrl: img.uri, sortOrder: prev.length }])}
            onRemove={handleRemoveImage}
            entityType="listing"
            entityId={id}
          />

          <SectionTitle>Informations generales</SectionTitle>
          <form.Field name="title">{(f) => <TextInput className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" placeholder="Titre" placeholderTextColor="#8B7E74" value={f.state.value} onChangeText={f.handleChange} />}</form.Field>
          <form.Field name="description">{(f) => <TextInput className="mt-3 rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" placeholder="Description" placeholderTextColor="#8B7E74" multiline style={{ minHeight: 100 }} textAlignVertical="top" value={f.state.value} onChangeText={f.handleChange} />}</form.Field>
          <form.Field name="price">{(f) => <View className="mt-3 flex-row items-center gap-2"><TextInput className="flex-1 rounded-input border border-border bg-card px-4 py-3 text-base text-foreground" placeholder="Prix" placeholderTextColor="#8B7E74" keyboardType="numeric" value={f.state.value} onChangeText={f.handleChange} /><Text className="text-base text-muted-foreground">XPF/mois</Text></View>}</form.Field>

          <SectionTitle>Duree</SectionTitle>
          <form.Field name="listingType">{(f) => <View className="flex-row gap-2">{LISTING_TYPES.map((dt) => <Pressable key={dt} className={`flex-1 items-center rounded-button py-2.5 ${f.state.value === dt ? 'bg-primary' : 'bg-muted'}`} onPress={() => f.handleChange(dt)}><Text className={`text-sm font-medium ${f.state.value === dt ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{LISTING_TYPE_LABELS[dt]}</Text></Pressable>)}</View>}</form.Field>
          <form.Field name="availableFrom">{(f) => <DateField label="Disponible a partir du" value={f.state.value} onChange={f.handleChange} />}</form.Field>
          <form.Field name="availableTo">{(f) => <DateField label="Jusqu'au (optionnel)" value={f.state.value} onChange={f.handleChange} placeholder="Pas de date de fin" />}</form.Field>

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
                    onPress={() => f.handleChange(c.code)}
                  >
                    <Text className={`text-sm ${f.state.value === c.code ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </form.Field>

          <SectionTitle>Logement</SectionTitle>
          <form.Field name="roomType">{(f) => <View className="flex-row gap-2">{ROOM_TYPES.map((rt) => <Pressable key={rt} className={`flex-1 items-center rounded-button py-2.5 ${f.state.value === rt ? 'bg-secondary' : 'bg-muted'}`} onPress={() => f.handleChange(rt)}><Text className={`text-sm font-medium ${f.state.value === rt ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>{ROOM_TYPE_LABELS[rt]}</Text></Pressable>)}</View>}</form.Field>
          <form.Field name="roommateCount">{(f) => <View className="mt-3"><View className="flex-row items-center gap-2"><Text className="text-base text-foreground">Colocataires actuels:</Text><TextInput className="w-16 rounded-input border border-border bg-card px-3 py-2 text-center text-base text-foreground" keyboardType="numeric" value={f.state.value} onChangeText={f.handleChange} /></View><Text className="mt-1 text-xs text-muted-foreground">Vous non compris</Text></View>}</form.Field>

          <SectionTitle>Equipements</SectionTitle>
          {([['privateBathroom', 'Salle de bain privee'], ['privateToilets', 'Toilettes privees'], ['pool', 'Piscine'], ['parking', 'Parking'], ['airConditioning', 'Climatisation'], ['petsAccepted', 'Animaux acceptes']] as const).map(([name, label]) => (
            <form.Field key={name} name={name}>{(f) => <View className="flex-row items-center justify-between py-2"><Text className="text-base text-foreground">{label}</Text><Switch value={f.state.value} onValueChange={f.handleChange} trackColor={{ true: '#FF6B35' }} /></View>}</form.Field>
          ))}

          <View className="mt-8 gap-3 pb-8">
            <Pressable className="items-center rounded-button bg-primary py-3.5" onPress={() => saveMutation.mutate()} disabled={isPending}>
              {isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-semibold text-primary-foreground">Enregistrer</Text>}
            </Pressable>
            {form.state.values.status === 'draft' && (
              <Pressable className="items-center rounded-button border border-border py-3.5" onPress={() => publishMutation.mutate()} disabled={isPending}>
                <Text className="text-base font-medium text-muted-foreground">Publier</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
