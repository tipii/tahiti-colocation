import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { DURATION_LABELS } from '@coloc/shared/constants'
import type { DurationType } from '@coloc/shared/constants'

import { orpc, client } from '@/lib/orpc'
import { ListingStatusBadge } from '@/components/ListingStatus'

export default function MyListingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const { data: listings = [], isLoading } = useQuery(orpc.listing.mine.queryOptions())

  const publishM = useMutation({
    mutationFn: (id: string) => client.listing.publish({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.listing.key() }),
  })

  const archiveM = useMutation({
    mutationFn: (id: string) => client.listing.archive({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.listing.key() }),
  })

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-2xl font-bold text-foreground">Mes annonces</Text>
      </View>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 60 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <Pressable className="rounded-card bg-card p-4 shadow-sm" onPress={() => router.push(`/listing/${item.slug}` as any)}>
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={1}>{item.title}</Text>
              <ListingStatusBadge status={item.status} />
            </View>
            <Text className="mt-1 text-sm text-muted-foreground">
              {item.commune}, {item.island} · {item.price.toLocaleString('fr-FR')} XPF · {item.views} vues
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable className="flex-row items-center gap-1 rounded-button bg-secondary px-3 py-1.5" onPress={() => router.push(`/listing/candidatures/${item.id}` as any)}>
                <Feather name="users" size={14} color="#fff" />
                <Text className="text-xs text-secondary-foreground">Candidatures</Text>
              </Pressable>
              <Pressable className="flex-row items-center gap-1 rounded-button bg-muted px-3 py-1.5" onPress={() => router.push(`/listing/edit/${item.id}` as any)}>
                <Feather name="edit-2" size={14} color="#8B7E74" />
                <Text className="text-xs text-muted-foreground">Modifier</Text>
              </Pressable>
              {item.status === 'draft' && (
                <Pressable className="flex-row items-center gap-1 rounded-button bg-primary px-3 py-1.5" onPress={() => publishM.mutate(item.id)}>
                  <Feather name="check" size={14} color="#fff" />
                  <Text className="text-xs text-primary-foreground">Publier</Text>
                </Pressable>
              )}
              {item.status === 'published' && (
                <Pressable className="flex-row items-center gap-1 rounded-button bg-muted px-3 py-1.5" onPress={() => archiveM.mutate(item.id)}>
                  <Feather name="archive" size={14} color="#8B7E74" />
                  <Text className="text-xs text-muted-foreground">Archiver</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<View className="items-center pt-20"><Text className="text-base text-muted-foreground">Aucune annonce</Text></View>}
      />
    </View>
  )
}
