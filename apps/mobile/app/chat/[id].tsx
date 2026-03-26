import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const navigation = useNavigation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  // Fetch conversation details (interlocutor info)
  const { data: conversation } = useQuery(
    orpc.chat.get.queryOptions({ input: { conversationId: conversationId! } }),
  )

  // Set header with interlocutor name/avatar + menu button
  useEffect(() => {
    if (!conversation?.otherUser) return
    const other = conversation.otherUser
    navigation.setOptions({
      headerTitle: () => (
        <View className="flex-row items-center gap-2.5">
          {other.avatar ? (
            <Image
              source={{ uri: other.avatar }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
            />
          ) : (
            <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
              <Text className="text-sm font-bold text-primary">
                {other.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text className="text-base font-semibold text-foreground">{other.name}</Text>
            {conversation.listingTitle && (
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>{conversation.listingTitle}</Text>
            )}
          </View>
        </View>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          className="h-10 w-10 items-center justify-center rounded-full"
          accessibilityLabel="Menu"
          accessibilityRole="button"
          style={{ marginRight: 4 }}
        >
          <Feather name="more-vertical" size={20} color="#FF6B35" />
        </Pressable>
      ),
    })
  }, [conversation, navigation])

  const { data: messages = [], isLoading, error, refetch } = useQuery({
    ...orpc.chat.messages.queryOptions({ input: { conversationId: conversationId! } }),
    enabled: !!conversationId,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  })

  const invertedMessages = [...messages].reverse()

  const sendMutation = useMutation({
    mutationFn: (content: string) => client.chat.send({ conversationId: conversationId!, content }),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: orpc.chat.key() })
    },
  })

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    sendMutation.mutate(trimmed)
  }

  if (isLoading) return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  )

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Feather name="wifi-off" size={48} color="#E8DDD3" />
        <Text className="mt-4 text-center text-lg font-semibold text-foreground">Connexion perdue</Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">Impossible de charger les messages</Text>
        <Pressable className="mt-6 rounded-button bg-primary px-6 py-3" accessibilityLabel="Réessayer" onPress={() => refetch()}>
          <Text className="text-base font-semibold text-primary-foreground">Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <View className="flex-1 bg-background">
        {/* Context menu dropdown */}
        {menuOpen && (
          <>
            <Pressable className="absolute inset-0 z-10" onPress={() => setMenuOpen(false)} />
            <View
              className="absolute right-3 z-20 overflow-hidden rounded-button border border-border bg-card"
              style={{ top: 4, minWidth: 200, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
            >
              <Pressable
                className="flex-row items-center gap-3 px-4 py-3.5 active:bg-muted"
                onPress={() => {
                  setMenuOpen(false)
                  if (conversation?.listingId) router.push(`/listing/${conversation.listingId}` as any)
                }}
              >
                <Feather name="home" size={16} color="#FF6B35" />
                <Text className="text-sm font-medium text-foreground">Voir l'annonce</Text>
              </Pressable>
            </View>
          </>
        )}

        <FlatList
          data={invertedMessages}
          inverted
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isMe = item.senderId === session?.user?.id
            return (
              <View className={`max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`} accessibilityLabel={`${isMe ? 'Vous' : 'Message reçu'}: ${item.content}`}>
                <View className={`rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary rounded-br-sm' : 'bg-card rounded-bl-sm'}`}>
                  <Text className={`text-base ${isMe ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {item.content}
                  </Text>
                </View>
                <Text className={`mt-1 text-xs text-muted-foreground ${isMe ? 'text-right' : ''}`}>
                  {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )
          }}
          ListEmptyComponent={
            <View className="items-center pt-20" style={{ transform: [{ scaleY: -1 }] }}>
              <Feather name="message-circle" size={48} color="#E8DDD3" />
              <Text className="mt-4 text-base text-muted-foreground">Commencez la conversation</Text>
            </View>
          }
        />

        <View className="flex-row items-end gap-2 border-t border-border bg-card px-4 py-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <TextInput
            className="flex-1 rounded-pill border border-border bg-background px-4 py-2.5 text-base text-foreground"
            placeholder="Votre message..."
            placeholderTextColor="#8B7E74"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            style={{ maxHeight: 100 }}
            accessibilityLabel="Écrire un message"
          />
          <Pressable
            className={`h-10 w-10 items-center justify-center rounded-full bg-primary ${(!text.trim() || sendMutation.isPending) ? 'opacity-50' : ''}`}
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            accessibilityLabel="Envoyer le message"
            accessibilityRole="button"
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
