import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { orpc, client } from '@/lib/orpc'

const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-accent', textColor: 'text-accent-foreground', icon: 'clock' },
  accepted: { label: 'Acceptée', color: 'bg-secondary', textColor: 'text-secondary-foreground', icon: 'check-circle' },
  finalized: { label: 'Retenue', color: 'bg-primary', textColor: 'text-primary-foreground', icon: 'award' },
  rejected: { label: 'Non retenue', color: 'bg-muted', textColor: 'text-muted-foreground', icon: 'x-circle' },
  withdrawn: { label: 'Retirée', color: 'bg-muted', textColor: 'text-muted-foreground', icon: 'corner-down-left' },
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days}j`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function CandidaturesScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const { data: candidatures = [], isLoading, refetch, isRefetching } = useQuery(orpc.candidature.mine.queryOptions())

  const withdrawM = useMutation({
    mutationFn: (id: string) => client.candidature.withdraw({ id }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: orpc.candidature.key() })
    },
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-2xl font-bold text-foreground">Mes candidatures</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          {candidatures.length} candidature{candidatures.length > 1 ? 's' : ''}
        </Text>
      </View>
      <FlatList
        data={candidatures}
        keyExtractor={(item) => item.id}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 60 }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={({ item }) => {
          const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending
          const c = item as any
          const isActive = item.status === 'pending' || item.status === 'accepted' || item.status === 'finalized'

          return (
            <Pressable
              className={`overflow-hidden rounded-card bg-card shadow-sm ${!isActive ? 'opacity-60' : ''}`}
              onPress={() => router.push(`/listing/${item.listingId}` as any)}
              accessibilityLabel={`Candidature ${config.label} pour ${c.listingTitle}`}
            >
              {/* Image */}
              <View className="relative">
                {c.listingImage ? (
                  <Image
                    source={{ uri: c.listingImage }}
                    style={{ width: '100%', height: 160 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="items-center justify-center bg-muted" style={{ width: '100%', height: 160 }}>
                    <Feather name="image" size={32} color="#E8DDD3" />
                  </View>
                )}
                {/* Status badge on image */}
                <View className={`absolute top-3 left-3 flex-row items-center gap-1.5 rounded-pill px-3 py-1 ${config.color}`}>
                  <Feather name={config.icon as any} size={12} color={item.status === 'finalized' ? '#fff' : undefined} />
                  <Text className={`text-xs font-semibold ${config.textColor}`}>{config.label}</Text>
                </View>
                {/* Time badge */}
                <View className="absolute top-3 right-3 rounded-pill bg-black/50 px-2.5 py-1">
                  <Text className="text-xs font-medium text-white">{timeAgo(item.createdAt)}</Text>
                </View>
              </View>

              {/* Content */}
              <View className="p-4">
                <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                  {c.listingTitle ?? 'Annonce'}
                </Text>

                {c.listingCommune && (
                  <View className="mt-1 flex-row items-center gap-1">
                    <Feather name="map-pin" size={13} color="#0D9488" />
                    <Text className="text-sm text-muted-foreground">{c.listingCommune}, {c.listingIsland}</Text>
                  </View>
                )}

                {item.message && (
                  <Text className="mt-2 text-sm text-muted-foreground italic" numberOfLines={2}>« {item.message} »</Text>
                )}

                {/* Actions */}
                <View className="mt-3 flex-row gap-2">
                  {item.status === 'pending' && (
                    <Pressable
                      className="flex-row items-center gap-1.5 rounded-button bg-muted px-4 py-2"
                      onPress={(e) => {
                        e.stopPropagation()
                        Alert.alert('Retirer', 'Retirer votre candidature ?', [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Retirer', style: 'destructive', onPress: () => withdrawM.mutate(item.id) },
                        ])
                      }}
                    >
                      <Feather name="x" size={14} color="#8B7E74" />
                      <Text className="text-sm text-muted-foreground">Retirer</Text>
                    </Pressable>
                  )}
                  {(item.status === 'accepted' || item.status === 'finalized') && c.conversationId && (
                    <Pressable
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-button bg-secondary py-2.5"
                      onPress={(e) => { e.stopPropagation(); router.push(`/chat/${c.conversationId}` as any) }}
                    >
                      <Feather name="message-circle" size={14} color="#fff" />
                      <Text className="text-sm font-medium text-secondary-foreground">Envoyer un message</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Feather name="send" size={48} color="#E8DDD3" />
            <Text className="mt-4 text-lg text-muted-foreground">Aucune candidature</Text>
            <Text className="mt-2 text-sm text-muted-foreground">Postulez à des annonces pour commencer</Text>
          </View>
        }
      />
    </View>
  )
}
