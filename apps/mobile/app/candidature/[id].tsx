import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'

import { authClient } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'
import { CandidatureBadge } from '@/components/CandidatureStatus'

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
}

function ContactBlock({ candidatureId }: { candidatureId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['candidature.contact', candidatureId],
    queryFn: () => client.candidature.contact({ id: candidatureId }),
  })

  if (isLoading) return <ActivityIndicator color="#FF6B35" />
  if (error || !data) return <Text className="text-sm text-destructive">Contact indisponible</Text>

  const wa = normalizePhone(data.whatsapp)
  return (
    <View className="rounded-card bg-card p-4 shadow-sm">
      <Text className="text-sm font-semibold uppercase text-muted-foreground">Contact</Text>
      <Text className="mt-2 text-base font-semibold text-foreground">{data.name}</Text>
      <View className="mt-3 gap-2">
        {wa && (
          <Pressable className="flex-row items-center gap-2 rounded-button bg-[#25D366] px-4 py-2.5" onPress={() => Linking.openURL(`https://wa.me/${wa}`)}>
            <Feather name="message-square" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">WhatsApp</Text>
          </Pressable>
        )}
        {data.phone && (
          <Pressable className="flex-row items-center gap-2 rounded-button bg-secondary px-4 py-2.5" onPress={() => Linking.openURL(`tel:${data.phone}`)}>
            <Feather name="phone" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-secondary-foreground">Appeler</Text>
          </Pressable>
        )}
        {data.email && (
          <Pressable className="flex-row items-center gap-2 rounded-button bg-muted px-4 py-2.5" onPress={() => Linking.openURL(`mailto:${data.email}`)}>
            <Feather name="mail" size={16} color="#8B7E74" />
            <Text className="text-sm font-medium text-muted-foreground">{data.email}</Text>
          </Pressable>
        )}
        {data.facebookUrl && (
          <Pressable className="flex-row items-center gap-2 rounded-button bg-[#1877F2] px-4 py-2.5" onPress={() => Linking.openURL(data.facebookUrl!)}>
            <Feather name="facebook" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Facebook</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

export default function CandidatureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const { data: list = [], isLoading } = useQuery({
    ...orpc.candidature.mine.queryOptions(),
    enabled: !!session,
  })

  const candidature = list.find((c: any) => c.id === id)

  const withdrawM = useMutation({
    mutationFn: () => client.candidature.withdraw({ id: id! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.candidature.key() })
      router.back()
    },
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>
  if (!candidature) return <View className="flex-1 items-center justify-center bg-background"><Text className="text-muted-foreground">Candidature introuvable</Text></View>

  const contactVisible = candidature.status === 'accepted' || candidature.status === 'finalized'

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Pressable
        className="flex-row items-center gap-3 overflow-hidden rounded-card bg-card p-3 shadow-sm"
        onPress={() => router.push(`/listing/${candidature.listingId}` as any)}
        accessibilityRole="link"
        accessibilityLabel="Ouvrir l'annonce"
      >
        {candidature.listingImage ? (
          <Image source={{ uri: candidature.listingImage }} style={{ width: 64, height: 64, borderRadius: 8 }} contentFit="cover" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-md bg-muted">
            <Feather name="home" size={24} color="#8B7E74" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{candidature.listingTitle ?? 'Annonce'}</Text>
          {candidature.listingCity && (
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>{candidature.listingCityLabel ?? candidature.listingCity}, {candidature.listingRegionLabel ?? candidature.listingRegion}</Text>
          )}
          <View className="mt-1.5">
            <CandidatureBadge status={candidature.status} />
          </View>
        </View>
        <Feather name="chevron-right" size={18} color="#8B7E74" />
      </Pressable>

      {candidature.message && (
        <View className="rounded-card bg-card p-4 shadow-sm">
          <Text className="text-sm font-semibold uppercase text-muted-foreground">Votre message</Text>
          <Text className="mt-2 text-base text-foreground">« {candidature.message} »</Text>
        </View>
      )}

      {candidature.preferredMoveInDate && (
        <Text className="text-sm text-muted-foreground">Emménagement souhaité: {new Date(candidature.preferredMoveInDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
      )}

      {candidature.status === 'rejected' && candidature.rejectionMessage && (
        <View className="rounded-card bg-muted p-4">
          <Text className="text-sm font-semibold uppercase text-muted-foreground">Message de l'annonceur</Text>
          <Text className="mt-2 text-base text-foreground">« {candidature.rejectionMessage} »</Text>
        </View>
      )}

      {contactVisible && <ContactBlock candidatureId={id!} />}

      {candidature.status === 'pending' && (
        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-button border border-border py-3.5"
          onPress={() => Alert.alert('Retirer', 'Retirer votre candidature ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Retirer', style: 'destructive', onPress: () => withdrawM.mutate() },
          ])}
        >
          <Feather name="x" size={16} color="#8B7E74" />
          <Text className="text-base text-muted-foreground">Retirer ma candidature</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}
