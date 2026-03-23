import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc, client } from '@/lib/orpc'
import { ISLANDS, DURATION_TYPES, DURATION_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, Island, RoomType } from '@coloc/shared/constants'

import { pickImage, uploadImage } from '@/lib/upload'

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-6 mb-2 text-sm font-semibold text-gray-400 uppercase">{children}</Text>
}

function SegmentControl<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[]
  labels: Record<T, string>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt}
          className={`flex-1 items-center rounded-lg py-2.5 ${value === opt ? 'bg-black' : 'bg-gray-100'}`}
          onPress={() => onChange(opt)}
        >
          <Text className={`text-sm font-medium ${value === opt ? 'text-white' : 'text-gray-700'}`}>
            {labels[opt]}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-base">{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  )
}

export default function CreateListingScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Form state
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
  const [photoUris, setPhotoUris] = useState<string[]>([])

  const handleAddPhoto = async () => {
    const asset = await pickImage()
    if (asset) {
      setPhotoUris((prev) => [...prev, asset.uri])
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index))
  }

  const submitMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const res = await client.listing.create({
        title,
        description,
        price: Number(price),
        durationType,
        availableFrom: new Date(availableFrom),
        availableTo: availableTo ? new Date(availableTo) : null,
        island,
        commune,
        roomType,
        numberOfPeople: Number(numberOfPeople),
        privateBathroom,
        privateToilets,
        pool,
        parking,
        airConditioning,
        petsAccepted,
        showPhone,
        contactEmail: contactEmail || null,
        status: publish ? 'published' : 'draft',
      })

      const listingId = res.id

      for (const uri of photoUris) {
        try {
          await uploadImage('listing', listingId, { uri, mimeType: 'image/jpeg' } as any)
        } catch (e) {
          console.error('Failed to upload photo:', e)
        }
      }

      if (publish) await client.listing.publish({ id: listingId })
      return publish
    },
    onSuccess: (published) => {
      queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
      Alert.alert('Succes', published ? 'Annonce publiee !' : 'Brouillon enregistre')
      router.replace('/(tabs)')
    },
    onError: () => {
      Alert.alert('Erreur', "Impossible de creer l'annonce")
    },
  })

  const handleSubmit = (publish: boolean) => {
    if (!title || !description || !price || !commune || !availableFrom) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires')
      return
    }
    submitMutation.mutate(publish)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-16 pb-8">
          <Text className="text-3xl font-bold">Nouvelle annonce</Text>

          {/* Photos */}
          <SectionTitle>Photos</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3">
              {photoUris.map((uri, i) => (
                <Pressable key={i} onPress={() => handleRemovePhoto(i)}>
                  <Image source={{ uri }} className="h-24 w-24 rounded-lg" />
                  <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-red-500">
                    <Text className="text-xs text-white font-bold">x</Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                className="h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300"
                onPress={handleAddPhoto}
              >
                <Text className="text-2xl text-gray-400">+</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* General */}
          <SectionTitle>Informations generales</SectionTitle>
          <TextInput
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            placeholder="Titre de l'annonce"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            placeholder="Description"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100 }}
            value={description}
            onChangeText={setDescription}
          />
          <View className="mt-3 flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              placeholder="Prix"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <Text className="text-base text-gray-500">XPF/mois</Text>
          </View>

          {/* Duration */}
          <SectionTitle>Duree</SectionTitle>
          <SegmentControl
            options={DURATION_TYPES}
            labels={DURATION_LABELS}
            value={durationType}
            onChange={setDurationType}
          />
          <TextInput
            className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            placeholder="Disponible a partir du (AAAA-MM-JJ)"
            value={availableFrom}
            onChangeText={setAvailableFrom}
          />
          <TextInput
            className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            placeholder="Jusqu'au (optionnel, AAAA-MM-JJ)"
            value={availableTo}
            onChangeText={setAvailableTo}
          />

          {/* Location */}
          <SectionTitle>Localisation</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {ISLANDS.map((i) => (
                <Pressable
                  key={i}
                  className={`rounded-full px-3 py-1.5 ${island === i ? 'bg-black' : 'bg-gray-100'}`}
                  onPress={() => setIsland(i)}
                >
                  <Text className={`text-sm ${island === i ? 'text-white' : 'text-gray-700'}`}>
                    {i}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput
            className="mt-3 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            placeholder="Commune"
            value={commune}
            onChangeText={setCommune}
          />

          {/* Room */}
          <SectionTitle>Logement</SectionTitle>
          <SegmentControl
            options={ROOM_TYPES}
            labels={ROOM_TYPE_LABELS}
            value={roomType}
            onChange={setRoomType}
          />
          <View className="mt-3 flex-row items-center gap-2">
            <Text className="text-base">Nombre de personnes:</Text>
            <TextInput
              className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-center text-base"
              keyboardType="numeric"
              value={numberOfPeople}
              onChangeText={setNumberOfPeople}
            />
          </View>

          {/* Amenities */}
          <SectionTitle>Equipements</SectionTitle>
          <ToggleRow label="Salle de bain privee" value={privateBathroom} onChange={setPrivateBathroom} />
          <ToggleRow label="Toilettes privees" value={privateToilets} onChange={setPrivateToilets} />
          <ToggleRow label="Piscine" value={pool} onChange={setPool} />
          <ToggleRow label="Parking" value={parking} onChange={setParking} />
          <ToggleRow label="Climatisation" value={airConditioning} onChange={setAirConditioning} />
          <ToggleRow label="Animaux acceptes" value={petsAccepted} onChange={setPetsAccepted} />

          {/* Contact */}
          <SectionTitle>Contact</SectionTitle>
          <ToggleRow label="Afficher mon telephone" value={showPhone} onChange={setShowPhone} />
          <TextInput
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            placeholder="Email de contact (optionnel)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={contactEmail}
            onChangeText={setContactEmail}
          />

          {/* Submit */}
          <View className="mt-8 gap-3 pb-8">
            <Pressable
              className="items-center rounded-lg bg-black py-3.5"
              onPress={() => handleSubmit(true)}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Publier</Text>
              )}
            </Pressable>
            <Pressable
              className="items-center rounded-lg border border-gray-300 py-3.5"
              onPress={() => handleSubmit(false)}
              disabled={submitMutation.isPending}
            >
              <Text className="text-base font-medium text-gray-600">Enregistrer en brouillon</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
