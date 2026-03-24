import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const { data: messages = [], isLoading } = useQuery({
    ...orpc.chat.messages.queryOptions({ input: { conversationId: conversationId! } }),
    enabled: !!conversationId,
    refetchInterval: 3000,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) => client.chat.send({ conversationId: conversationId!, content }),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: orpc.chat.key() })
    },
  })

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    sendMutation.mutate(trimmed)
  }

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMe = item.senderId === session?.user?.id
          return (
            <View className={`max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
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
          <View className="items-center pt-20">
            <Text className="text-base text-muted-foreground">Commencez la conversation</Text>
          </View>
        }
      />

      {/* Input */}
      <View className="flex-row items-end gap-2 border-t border-border bg-card px-4 py-3">
        <TextInput
          className="flex-1 rounded-pill border border-border bg-background px-4 py-2.5 text-base text-foreground"
          placeholder="Votre message..."
          placeholderTextColor="#8B7E74"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Feather name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
