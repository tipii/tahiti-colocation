import { useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { orpc, client } from '@/lib/orpc'

export default function CandidaturesManagementScreen() {
  const { id: listingId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: candidatures = [], isLoading, refetch, isRefetching } = useQuery({
    ...orpc.candidature.forListing.queryOptions({ input: { listingId: listingId! } }),
    enabled: !!listingId,
  })

  const acceptM = useMutation({
    mutationFn: (id: string) => client.candidature.accept({ id }),
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); invalidate() },
  })

  const rejectM = useMutation({
    mutationFn: (id: string) => client.candidature.reject({ id }),
    onSuccess: () => invalidate(),
  })

  const [finalizeTarget, setFinalizeTarget] = useState<string | null>(null)
  const [rejectionMessage, setRejectionMessage] = useState('')

  const finalizeM = useMutation({
    mutationFn: () => client.candidature.finalize({
      candidatureId: finalizeTarget!,
      rejectionMessage: rejectionMessage || null,
    }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setFinalizeTarget(null)
      setRejectionMessage('')
      invalidate()
      Alert.alert('Annonce finalisée', "L'annonce a été archivée et les autres candidats informés.")
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.candidature.key() })
    queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
  }

  const pending = candidatures.filter((c: any) => c.status === 'pending')
  const accepted = candidatures.filter((c: any) => c.status === 'accepted' || c.status === 'finalized')
  const rejected = candidatures.filter((c: any) => c.status === 'rejected' || c.status === 'withdrawn')

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  // Finalize confirmation view
  if (finalizeTarget) {
    const chosen = candidatures.find((c: any) => c.id === finalizeTarget)
    return (
      <View className="flex-1 bg-background px-6 pt-6">
        <Text className="text-xl font-bold text-foreground">Finaliser la sélection</Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          Vous choisissez <Text className="font-semibold text-foreground">{(chosen as any)?.user?.name}</Text>. L'annonce sera archivée et les autres candidats seront informés.
        </Text>

        <View className="mt-6">
          <Text className="mb-2 text-sm font-medium text-foreground">Message aux candidats non retenus (optionnel)</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            placeholder="Merci pour votre intérêt, la chambre a trouvé preneur..."
            placeholderTextColor="#8B7E74"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 100 }}
            maxLength={300}
            value={rejectionMessage}
            onChangeText={setRejectionMessage}
          />
        </View>

        <View className="mt-6 gap-3">
          <Pressable
            className={`items-center rounded-button bg-primary py-3.5 ${finalizeM.isPending ? 'opacity-50' : ''}`}
            onPress={() => finalizeM.mutate()}
            disabled={finalizeM.isPending}
          >
            {finalizeM.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-semibold text-primary-foreground">Confirmer</Text>}
          </Pressable>
          <Pressable className="items-center rounded-button border border-border py-3.5" onPress={() => setFinalizeTarget(null)}>
            <Text className="text-base font-medium text-muted-foreground">Annuler</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={[
          ...(pending.length ? [{ type: 'header', title: `En attente (${pending.length})` }] : []),
          ...pending.map((c: any) => ({ type: 'candidature', ...c })),
          ...(accepted.length ? [{ type: 'header', title: `Acceptées (${accepted.length})` }] : []),
          ...accepted.map((c: any) => ({ type: 'candidature', ...c })),
          ...(rejected.length ? [{ type: 'header', title: `Non retenues (${rejected.length})` }] : []),
          ...rejected.map((c: any) => ({ type: 'candidature', ...c })),
        ] as any[]}
        keyExtractor={(item, i) => item.id ?? `header-${i}`}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        contentContainerStyle={{ padding: 24 }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text className="mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase">{item.title}</Text>
          }

          const u = item.user
          const isAccepted = item.status === 'accepted' || item.status === 'finalized'
          const isPending = item.status === 'pending'
          const isRejected = item.status === 'rejected' || item.status === 'withdrawn'

          const tags: string[] = []
          if (u?.age) tags.push(`${u.age} ans`)
          if (u?.occupation) tags.push(({ student: 'Étudiant·e', employed: 'Salarié·e', self_employed: 'Indépendant·e', retired: 'Retraité·e', other: 'Autre' } as any)[u.occupation])
          if (u?.smoker) tags.push(({ no: 'Non-fumeur', outside: 'Fume dehors', yes: 'Fumeur' } as any)[u.smoker])
          if (u?.pets && u.pets !== 'none') tags.push(({ cat: '🐱', dog: '🐶', other: 'Animal' } as any)[u.pets])

          return (
            <View className={`mb-3 rounded-card bg-card p-4 shadow-sm ${isRejected ? 'opacity-50' : ''}`}>
              <View className="flex-row items-center gap-3">
                {u?.avatar ? (
                  <Image source={{ uri: u.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} contentFit="cover" />
                ) : (
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
                    <Text className="text-base font-bold text-primary">{u?.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{u?.name}{item.isCouple ? ' · Couple' : ''}</Text>
                  {tags.length > 0 && <Text className="text-xs text-muted-foreground">{tags.join(' · ')}</Text>}
                </View>
              </View>

              {u?.bio && <Text className="mt-2 text-sm text-foreground" numberOfLines={2}>{u.bio}</Text>}

              {item.message && (
                <Text className="mt-2 text-sm text-muted-foreground italic">« {item.message} »</Text>
              )}

              <Text className="mt-2 text-xs text-muted-foreground">
                {item.preferredMoveInDate && `Emménagement: ${new Date(item.preferredMoveInDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · `}
                Postulé le {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </Text>

              <View className="mt-3 flex-row gap-2">
                {isPending && (
                  <>
                    <Pressable
                      className="flex-1 flex-row items-center justify-center gap-1 rounded-button bg-secondary py-2"
                      onPress={() => acceptM.mutate(item.id)}
                    >
                      <Feather name="check" size={14} color="#fff" />
                      <Text className="text-sm font-medium text-secondary-foreground">Accepter</Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 flex-row items-center justify-center gap-1 rounded-button bg-muted py-2"
                      onPress={() => Alert.alert('Refuser', 'Refuser cette candidature ?', [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Refuser', style: 'destructive', onPress: () => rejectM.mutate(item.id) },
                      ])}
                    >
                      <Feather name="x" size={14} color="#8B7E74" />
                      <Text className="text-sm font-medium text-muted-foreground">Refuser</Text>
                    </Pressable>
                  </>
                )}
                {isAccepted && (
                  <>
                    <Pressable
                      className="flex-row items-center gap-1 rounded-button bg-secondary px-3 py-2"
                      onPress={() => router.push(`/candidature/${item.id}` as any)}
                    >
                      <Feather name="phone" size={14} color="#fff" />
                      <Text className="text-sm font-medium text-secondary-foreground">Contact</Text>
                    </Pressable>
                    {item.status === 'accepted' && (
                      <Pressable
                        className="flex-row items-center gap-1 rounded-button bg-primary px-3 py-2"
                        onPress={() => setFinalizeTarget(item.id)}
                      >
                        <Feather name="award" size={14} color="#fff" />
                        <Text className="text-sm font-medium text-primary-foreground">Finaliser</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Feather name="users" size={48} color="#E8DDD3" />
            <Text className="mt-4 text-base text-muted-foreground">Aucune candidature</Text>
          </View>
        }
      />
    </View>
  )
}
