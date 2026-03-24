import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'

import { orpc } from '@/lib/orpc'

export default function MessagesScreen() {
  const router = useRouter()

  const { data: conversations = [], isLoading, refetch, isRefetching } = useQuery(
    orpc.chat.list.queryOptions(),
  )

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        contentContainerStyle={{ paddingVertical: 8 }}
        ItemSeparatorComponent={() => <View className="mx-6 h-px bg-border" />}
        renderItem={({ item }) => (
          <Pressable
            className="flex-row items-center gap-3 px-6 py-4"
            onPress={() => router.push(`/chat/${item.id}` as any)}
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Text className="text-lg font-bold text-primary">
                {item.otherUser?.name?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                  {item.otherUser?.name ?? 'Utilisateur'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {new Date(item.lastMessageAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                {item.listingTitle}
              </Text>
              {item.lastMessage && (
                <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Feather name="message-circle" size={48} color="#E8DDD3" />
            <Text className="mt-4 text-base text-muted-foreground">Aucun message</Text>
          </View>
        }
      />
    </View>
  )
}
