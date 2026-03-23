import { useState } from 'react'
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ISLANDS, DURATION_TYPES, DURATION_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, Island, RoomType } from '@coloc/shared/constants'
import type { Image as ImageType } from '@coloc/shared/types'

import { orpc, client } from '@/lib/orpc'
import { apiFetch } from '@/lib/api'
import { pickImage, uploadImage } from '@/lib/upload'

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-6 mb-2 text-sm font-semibold text-gray-400 uppercase">{children}</Text>
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <View className="flex-row items-center justify-between py-2"><Text className="text-base">{label}</Text><Switch value={value} onValueChange={onChange} /></View>
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [durationType, setDurationType] = useState<DurationType>('long_terme')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [island, setIsland] = useState<Island>('Tahiti')
  const [commune, setCommune] = useState('')
  const [roomType, setRoomType] = useState<RoomType>('single')
  const [numberOfPeople, setNumberOfPeople] = useState('1')
  const [privateBathroom, setPrivateBathroom] = useState(false)
  const [privateToilets, setPrivateToilets] = useState(false)
  const [pool, setPool] = useState(false)
  const [parking, setParking] = useState(false)
  const [airConditioning, setAirConditioning] = useState(false)
  const [petsAccepted, setPetsAccepted] = useState(false)
  const [showPhone, setShowPhone] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [status, setStatus] = useState<string>('draft')
  const [existingImages, setExistingImages] = useState<ImageType[]>([])
  const [initialized, setInitialized] = useState(false)

  const { isLoading } = useQuery({
    ...orpc.listing.get.queryOptions({ input: { idOrSlug: id! } }),
    enabled: !!id,
    select: (l) => {
      if (!initialized) {
        setTitle(l.title); setDescription(l.description); setPrice(String(l.price))
        setDurationType(l.durationType as DurationType)
        setAvailableFrom(new Date(l.availableFrom).toISOString().split('T')[0])
        setAvailableTo(l.availableTo ? new Date(l.availableTo).toISOString().split('T')[0] : '')
        setIsland(l.island as Island); setCommune(l.commune)
        setRoomType(l.roomType as RoomType); setNumberOfPeople(String(l.numberOfPeople))
        setPrivateBathroom(l.privateBathroom); setPrivateToilets(l.privateToilets)
        setPool(l.pool); setParking(l.parking); setAirConditioning(l.airConditioning)
        setPetsAccepted(l.petsAccepted); setShowPhone(l.showPhone)
        setContactEmail(l.contactEmail ?? ''); setStatus(l.status)
        setExistingImages(l.images ?? []); setInitialized(true)
      }
      return l
    },
  })

  const handleAddPhoto = async () => {
    const asset = await pickImage()
    if (!asset) return
    try {
      const result = await uploadImage('listing', id!, asset)
      setExistingImages((prev) => [...prev, { id: result.id, originalUrl: result.mediumUrl, mediumUrl: result.mediumUrl, thumbnailUrl: result.thumbnailUrl, sortOrder: prev.length }])
    } catch { Alert.alert('Erreur', "Impossible d'ajouter la photo") }
  }

  const handleDeleteImage = async (imageId: string) => {
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
    mutationFn: () => client.listing.update({
      id: id!, title, description, price: Number(price), durationType,
      availableFrom: new Date(availableFrom), availableTo: availableTo ? new Date(availableTo) : null,
      island, commune, roomType, numberOfPeople: Number(numberOfPeople),
      privateBathroom, privateToilets, pool, parking, airConditioning, petsAccepted,
      showPhone, contactEmail: contactEmail || null,
    }),
    onSuccess: () => { Alert.alert('Succes', 'Annonce mise a jour'); invalidate() },
    onError: () => Alert.alert('Erreur', 'Impossible de mettre a jour'),
  })

  const publishMutation = useMutation({
    mutationFn: () => client.listing.publish({ id: id! }),
    onSuccess: () => { Alert.alert('Succes', 'Annonce publiee !'); invalidate() },
    onError: () => Alert.alert('Erreur', 'Impossible de publier'),
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator size="large" /></View>

  const isPending = saveMutation.isPending || publishMutation.isPending

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-6 pb-8">
          <SectionTitle>Photos</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3">
              {existingImages.map((img) => (
                <Pressable key={img.id} onPress={() => handleDeleteImage(img.id)}>
                  <Image source={{ uri: img.thumbnailUrl ?? img.mediumUrl ?? '' }} className="h-24 w-24 rounded-lg" />
                  <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-red-500"><Text className="text-xs font-bold text-white">x</Text></View>
                </Pressable>
              ))}
              <Pressable className="h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300" onPress={handleAddPhoto}><Text className="text-2xl text-gray-400">+</Text></Pressable>
            </View>
          </ScrollView>

          <SectionTitle>Informations generales</SectionTitle>
          <TextInput className="rounded-lg border border-gray-300 px-3 py-2.5 text-base" placeholder="Titre" value={title} onChangeText={setTitle} />
          <TextInput className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base" placeholder="Description" multiline style={{ minHeight: 100 }} textAlignVertical="top" value={description} onChangeText={setDescription} />
          <View className="mt-3 flex-row items-center gap-2">
            <TextInput className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base" placeholder="Prix" keyboardType="numeric" value={price} onChangeText={setPrice} />
            <Text className="text-base text-gray-500">XPF/mois</Text>
          </View>

          <SectionTitle>Duree</SectionTitle>
          <View className="flex-row gap-2">{DURATION_TYPES.map((dt) => <Pressable key={dt} className={`flex-1 items-center rounded-lg py-2.5 ${durationType === dt ? 'bg-black' : 'bg-gray-100'}`} onPress={() => setDurationType(dt)}><Text className={`text-sm font-medium ${durationType === dt ? 'text-white' : 'text-gray-700'}`}>{DURATION_LABELS[dt]}</Text></Pressable>)}</View>
          <TextInput className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base" placeholder="Disponible a partir du (AAAA-MM-JJ)" value={availableFrom} onChangeText={setAvailableFrom} />
          <TextInput className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base" placeholder="Jusqu'au (optionnel)" value={availableTo} onChangeText={setAvailableTo} />

          <SectionTitle>Localisation</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="flex-row gap-2">{ISLANDS.map((i) => <Pressable key={i} className={`rounded-full px-3 py-1.5 ${island === i ? 'bg-black' : 'bg-gray-100'}`} onPress={() => setIsland(i)}><Text className={`text-sm ${island === i ? 'text-white' : 'text-gray-700'}`}>{i}</Text></Pressable>)}</View></ScrollView>
          <TextInput className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base" placeholder="Commune" value={commune} onChangeText={setCommune} />

          <SectionTitle>Logement</SectionTitle>
          <View className="flex-row gap-2">{ROOM_TYPES.map((rt) => <Pressable key={rt} className={`flex-1 items-center rounded-lg py-2.5 ${roomType === rt ? 'bg-black' : 'bg-gray-100'}`} onPress={() => setRoomType(rt)}><Text className={`text-sm font-medium ${roomType === rt ? 'text-white' : 'text-gray-700'}`}>{ROOM_TYPE_LABELS[rt]}</Text></Pressable>)}</View>
          <View className="mt-3 flex-row items-center gap-2"><Text className="text-base">Nombre de personnes:</Text><TextInput className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-center text-base" keyboardType="numeric" value={numberOfPeople} onChangeText={setNumberOfPeople} /></View>

          <SectionTitle>Equipements</SectionTitle>
          <ToggleRow label="Salle de bain privee" value={privateBathroom} onChange={setPrivateBathroom} />
          <ToggleRow label="Toilettes privees" value={privateToilets} onChange={setPrivateToilets} />
          <ToggleRow label="Piscine" value={pool} onChange={setPool} />
          <ToggleRow label="Parking" value={parking} onChange={setParking} />
          <ToggleRow label="Climatisation" value={airConditioning} onChange={setAirConditioning} />
          <ToggleRow label="Animaux acceptes" value={petsAccepted} onChange={setPetsAccepted} />

          <SectionTitle>Contact</SectionTitle>
          <ToggleRow label="Afficher mon telephone" value={showPhone} onChange={setShowPhone} />
          <TextInput className="mt-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base" placeholder="Email de contact (optionnel)" keyboardType="email-address" autoCapitalize="none" value={contactEmail} onChangeText={setContactEmail} />

          <View className="mt-8 gap-3 pb-8">
            <Pressable className="items-center rounded-lg bg-black py-3.5" onPress={() => saveMutation.mutate()} disabled={isPending}>
              {isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-semibold text-white">Enregistrer</Text>}
            </Pressable>
            {status === 'draft' && <Pressable className="items-center rounded-lg border border-gray-300 py-3.5" onPress={() => publishMutation.mutate()} disabled={isPending}><Text className="text-base font-medium text-gray-600">Publier</Text></Pressable>}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
