import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'

import { orpc, client } from '@/lib/orpc'

const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-accent', textColor: 'text-accent-foreground', icon: 'clock' },
  accepted: { label: 'Acceptée', color: 'bg-secondary', textColor: 'text-secondary-foreground', icon: 'check-circle' },
  finalized: { label: 'Retenue', color: 'bg-primary', textColor: 'text-primary-foreground', icon: 'award' },
  rejected: { label: 'Non retenue', color: 'bg-muted', textColor: 'text-muted-foreground', icon: 'x-circle' },
  withdrawn: { label: 'Retirée', color: 'bg-muted', textColor: 'text-muted-foreground', icon: 'corner-down-left' },
}

export default function CandidaturesScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const { data: candidatures = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-candidatures'],
    queryFn: () => client.candidature.mine(),
  })

  const withdrawM = useMutation({
    mutationFn: (id: string) => client.candidature.withdraw({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-candidatures'] }),
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-2xl font-bold text-foreground">Mes candidatures</Text>
      </View>
      <FlatList
        data={candidatures}
        keyExtractor={(item) => item.id}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 60 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => {
          const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending
          return (
            <View className="rounded-card bg-card p-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
                  {item.listingTitle ?? 'Annonce'}
                </Text>
                <View className={`flex-row items-center gap-1 rounded-pill px-2.5 py-0.5 ${config.color}`}>
                  <Feather name={config.icon as any} size={12} color={item.status === 'finalized' ? '#fff' : undefined} />
                  <Text className={`text-xs font-medium ${config.textColor}`}>{config.label}</Text>
                </View>
              </View>

              {item.message && (
                <Text className="mt-2 text-sm text-muted-foreground" numberOfLines={2}>« {item.message} »</Text>
              )}

              <Text className="mt-1 text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>

              <View className="mt-3 flex-row gap-2">
                {item.status === 'pending' && (
                  <Pressable
                    className="flex-row items-center gap-1 rounded-button bg-muted px-3 py-1.5"
                    onPress={() => Alert.alert('Retirer', 'Retirer votre candidature ?', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Retirer', style: 'destructive', onPress: () => withdrawM.mutate(item.id) },
                    ])}
                  >
                    <Feather name="x" size={14} color="#8B7E74" />
                    <Text className="text-xs text-muted-foreground">Retirer</Text>
                  </Pressable>
                )}
                {(item.status === 'accepted' || item.status === 'finalized') && item.conversationId && (
                  <Pressable
                    className="flex-row items-center gap-1 rounded-button bg-secondary px-3 py-1.5"
                    onPress={() => router.push(`/chat/${item.conversationId}` as any)}
                  >
                    <Feather name="message-circle" size={14} color="#fff" />
                    <Text className="text-xs text-secondary-foreground">Message</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Feather name="send" size={48} color="#E8DDD3" />
            <Text className="mt-4 text-base text-muted-foreground">Aucune candidature</Text>
            <Text className="mt-1 text-sm text-muted-foreground">Postulez à des annonces pour commencer</Text>
          </View>
        }
      />
    </View>
  )
}
