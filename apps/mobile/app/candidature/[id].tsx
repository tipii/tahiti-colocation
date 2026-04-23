import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'

import { authClient } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-accent' },
  accepted: { label: 'Acceptée', color: 'bg-secondary' },
  finalized: { label: 'Retenue', color: 'bg-primary' },
  rejected: { label: 'Non retenue', color: 'bg-muted' },
  withdrawn: { label: 'Retirée', color: 'bg-muted' },
}

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
      queryClient.invalidateQueries({ queryKey: ['candidature'] })
      router.back()
    },
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>
  if (!candidature) return <View className="flex-1 items-center justify-center bg-background"><Text className="text-muted-foreground">Candidature introuvable</Text></View>

  const status = STATUS_LABELS[candidature.status] ?? STATUS_LABELS.pending
  const contactVisible = candidature.status === 'accepted' || candidature.status === 'finalized'

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View>
        <Text className="text-xl font-bold text-foreground">{candidature.listingTitle ?? 'Annonce'}</Text>
        {candidature.listingCommune && (
          <Text className="mt-1 text-sm text-muted-foreground">{candidature.listingCommune}, {candidature.listingIsland}</Text>
        )}
        <View className={`mt-2 self-start rounded-pill px-3 py-1 ${status.color}`}>
          <Text className="text-xs font-semibold text-foreground">{status.label}</Text>
        </View>
      </View>

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
