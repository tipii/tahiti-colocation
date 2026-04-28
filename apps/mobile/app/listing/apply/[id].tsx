import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { authClient } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'
import { DateField } from '@/components/DateField'

function profileComplete(p: any | undefined) {
  if (!p) return { ok: false, missing: ['profil'], emailVerified: false }
  const missing: string[] = []
  if (!(p.avatar || p.image)) missing.push('photo')
  if (!p.name) missing.push('nom')
  if (!p.dob) missing.push('date de naissance')
  if (!p.occupation) missing.push('métier')
  if (!p.smoker) missing.push('tabac')
  if (!p.pets) missing.push('animaux')
  if (!p.phone) missing.push('téléphone')
  return { ok: missing.length === 0 && p.emailVerified, missing, emailVerified: !!p.emailVerified }
}

export default function ApplyScreen() {
  const { id: listingId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [isCouple, setIsCouple] = useState(false)
  const [moveInDate, setMoveInDate] = useState('')

  const { data: profile } = useQuery(orpc.user.me.queryOptions())
  const { ok: canApply, missing, emailVerified } = profileComplete(profile)

  const resendM = useMutation({
    mutationFn: () => authClient.sendVerificationEmail({ email: profile!.email }),
    onSuccess: () => Alert.alert('Email envoyé', 'Vérifie ta boîte mail (et le dossier spam).'),
    onError: () => Alert.alert('Erreur', "Impossible de renvoyer l'email"),
  })

  const applyMutation = useMutation({
    mutationFn: () => client.candidature.apply({
      listingId: listingId!,
      message: message || null,
      isCouple,
      preferredMoveInDate: moveInDate ? new Date(moveInDate) : null,
    }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: orpc.candidature.key() })
      Alert.alert('Candidature envoyée !', "L'annonceur recevra votre demande.", [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (e: any) => Alert.alert('Erreur', e.message ?? "Impossible d'envoyer la candidature"),
  })

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Feather name="send" size={28} color="#FF6B35" />
          </View>
          <Text className="mt-4 text-xl font-bold text-foreground">Postuler</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">L'annonceur verra votre profil complet.</Text>
        </View>

        {!emailVerified && profile && (
          <View className="mt-6 rounded-card bg-accent/40 p-4">
            <Text className="text-sm font-semibold text-foreground">Confirme ton email</Text>
            <Text className="mt-1 text-sm text-muted-foreground">Tu dois confirmer {profile.email} avant de postuler. Vérifie ta boîte mail (et le spam).</Text>
            <Pressable className="mt-3 items-center rounded-button bg-primary py-2.5" onPress={() => resendM.mutate()} disabled={resendM.isPending}>
              <Text className="text-sm font-semibold text-primary-foreground">{resendM.isPending ? 'Envoi…' : "Renvoyer l'email"}</Text>
            </Pressable>
          </View>
        )}

        {!canApply && missing.length > 0 && (
          <View className="mt-6 rounded-card bg-destructive/10 p-4">
            <Text className="text-sm font-semibold text-destructive">Complétez votre profil</Text>
            <Text className="mt-1 text-sm text-destructive">Manquant: {missing.join(', ')}</Text>
            <Pressable className="mt-3 items-center rounded-button bg-destructive py-2.5" onPress={() => router.push('/profile/edit' as any)}>
              <Text className="text-sm font-semibold text-white">Compléter maintenant</Text>
            </Pressable>
          </View>
        )}

        <View className="mt-8">
          <Text className="mb-2 text-sm font-medium text-foreground">Message</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            placeholder="Bonjour, je suis intéressé(e)..." placeholderTextColor="#8B7E74"
            multiline textAlignVertical="top" style={{ minHeight: 120 }} maxLength={500}
            value={message} onChangeText={setMessage}
          />
          <Text className="mt-1 text-right text-xs text-muted-foreground">{message.length}/500</Text>
        </View>

        <View className="mt-2">
          <DateField
            label="Date d'emménagement souhaitée"
            value={moveInDate}
            onChange={setMoveInDate}
            placeholder="Choisir une date"
          />
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-card bg-card px-4 py-3">
          <View className="flex-1">
            <Text className="text-base text-foreground">Je postule en couple</Text>
            <Text className="text-xs text-muted-foreground">Nous serons 2 à emménager</Text>
          </View>
          <Switch value={isCouple} onValueChange={setIsCouple} trackColor={{ true: '#FF6B35' }} />
        </View>

        <Pressable
          className={`mt-8 flex-row items-center justify-center gap-2 rounded-button bg-primary py-3.5 ${(applyMutation.isPending || !canApply) ? 'opacity-50' : ''}`}
          onPress={() => applyMutation.mutate()}
          disabled={applyMutation.isPending || !canApply}
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
