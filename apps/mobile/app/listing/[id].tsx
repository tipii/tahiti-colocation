import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DURATION_LABELS, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, RoomType } from '@coloc/shared/constants'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'

function Amenity({ label, value }: { label: string; value: boolean }) {
  if (!value) return null
  return <View className="rounded-lg bg-gray-50 px-3 py-2"><Text className="text-sm text-gray-700">{label}</Text></View>
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const [imageIndex, setImageIndex] = useState(0)

  const { data: listing, isLoading } = useQuery(
    orpc.listing.get.queryOptions({ input: { idOrSlug: id! } }),
  )

  const deleteM = useMutation({
    mutationFn: () => client.listing.delete({ id: listing!.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: orpc.listing.key() }); router.back() },
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator size="large" /></View>
  if (!listing) return <View className="flex-1 items-center justify-center bg-white"><Text className="text-gray-400">Annonce introuvable</Text></View>

  const isOwner = session?.user?.id === listing.authorId
  const images = listing.images ?? []

  return (
    <ScrollView className="flex-1 bg-white">
      {images.length > 0 ? (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {images.map((img) => <Image key={img.id} source={{ uri: img.mediumUrl ?? '' }} style={{ width, height: 300 }} resizeMode="cover" />)}
          </ScrollView>
          {images.length > 1 && <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">{images.map((_, i) => <View key={i} className={`h-2 w-2 rounded-full ${i === imageIndex ? 'bg-white' : 'bg-white/50'}`} />)}</View>}
        </View>
      ) : <View className="h-48 bg-gray-100" />}

      <View className="px-6 py-5 gap-5">
        <View>
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-gray-100 px-2.5 py-1"><Text className="text-xs text-gray-600">{DURATION_LABELS[listing.durationType as DurationType]}</Text></View>
            {listing.status === 'draft' && <View className="rounded-full bg-yellow-100 px-2.5 py-1"><Text className="text-xs text-yellow-700">Brouillon</Text></View>}
          </View>
          <Text className="mt-2 text-2xl font-bold">{listing.title}</Text>
          <Text className="mt-1 text-base text-gray-500">{listing.commune}, {listing.island}</Text>
          <Text className="mt-2 text-2xl font-bold">{listing.price.toLocaleString('fr-FR')} XPF/mois</Text>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-400 uppercase">Disponibilite</Text>
          <Text className="mt-1 text-base">A partir du {new Date(listing.availableFrom).toLocaleDateString('fr-FR')}{listing.availableTo && ` jusqu'au ${new Date(listing.availableTo).toLocaleDateString('fr-FR')}`}</Text>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-400 uppercase">Logement</Text>
          <Text className="mt-1 text-base">{ROOM_TYPE_LABELS[listing.roomType as RoomType]} · {listing.numberOfPeople} {listing.numberOfPeople > 1 ? 'personnes' : 'personne'}</Text>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-400 uppercase">Equipements</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <Amenity label="Salle de bain privee" value={listing.privateBathroom} />
            <Amenity label="Toilettes privees" value={listing.privateToilets} />
            <Amenity label="Piscine" value={listing.pool} />
            <Amenity label="Parking" value={listing.parking} />
            <Amenity label="Climatisation" value={listing.airConditioning} />
            <Amenity label="Animaux acceptes" value={listing.petsAccepted} />
          </View>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-400 uppercase">Description</Text>
          <Text className="mt-2 text-base leading-6 text-gray-700">{listing.description}</Text>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-400 uppercase">Contact</Text>
          <View className="mt-2 gap-1">
            {listing.author && <Text className="text-base font-medium">{listing.author.name}</Text>}
            {listing.contactEmail && <Text className="text-base text-gray-600">{listing.contactEmail}</Text>}
          </View>
        </View>

        {isOwner && (
          <View className="gap-3 pb-8">
            <Pressable className="items-center rounded-lg bg-black py-3" onPress={() => router.push(`/listing/edit/${listing.id}` as any)}>
              <Text className="text-base font-semibold text-white">Modifier</Text>
            </Pressable>
            <Pressable className="items-center rounded-lg border border-red-500 py-3" onPress={() => Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer cette annonce ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => deleteM.mutate() }])}>
              <Text className="text-base font-semibold text-red-500">Supprimer</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
