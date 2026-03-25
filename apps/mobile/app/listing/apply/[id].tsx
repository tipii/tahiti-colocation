import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { client } from '@/lib/orpc'

export default function ApplyScreen() {
  const { id: listingId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')

  const applyMutation = useMutation({
    mutationFn: () => client.candidature.apply({ listingId: listingId!, message: message || null }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['my-candidatures'] })
      Alert.alert('Candidature envoyée !', 'Le propriétaire recevra votre demande.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (e: any) => {
      Alert.alert('Erreur', e.message ?? "Impossible d'envoyer la candidature")
    },
  })

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 px-6 pt-6">
        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Feather name="send" size={28} color="#FF6B35" />
          </View>
          <Text className="mt-4 text-xl font-bold text-foreground">Postuler</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            Présentez-vous au propriétaire. Votre profil et bio seront visibles.
          </Text>
        </View>

        <View className="mt-8">
          <Text className="mb-2 text-sm font-medium text-foreground">Message (optionnel)</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            placeholder="Bonjour, je suis intéressé(e) par votre annonce..."
            placeholderTextColor="#8B7E74"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 120 }}
            maxLength={500}
            value={message}
            onChangeText={setMessage}
            accessibilityLabel="Message de candidature"
          />
          <Text className="mt-1 text-right text-xs text-muted-foreground">{message.length}/500</Text>
        </View>

        <Pressable
          className={`mt-6 flex-row items-center justify-center gap-2 rounded-button bg-primary py-3.5 ${applyMutation.isPending ? 'opacity-50' : ''}`}
          onPress={() => applyMutation.mutate()}
          disabled={applyMutation.isPending}
          accessibilityLabel="Envoyer la candidature"
        >
          {applyMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="send" size={18} color="#fff" />
              <Text className="text-base font-semibold text-primary-foreground">Envoyer ma candidature</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
