import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link, useRouter } from 'expo-router'

import { authClient } from '@/lib/auth'

export default function SignupScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    const result = await authClient.signUp.email({ email, password, name })
    if (result.error) {
      setError(result.error.message ?? 'Une erreur est survenue')
      setLoading(false)
    } else {
      Alert.alert('Email de confirmation envoyé', `Vérifie ${email} pour confirmer ton compte. Tu peux continuer en attendant.`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ])
    }
  }

  const handleFacebookSignup = async () => {
    const { error } = await authClient.signIn.social({
      provider: 'facebook',
      callbackURL: '/(tabs)',
    })
    if (!error) {
      router.replace('/(tabs)')
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <Text className="text-center text-3xl font-bold text-primary">Coolive</Text>
        <Text className="mt-1 text-center text-base text-secondary italic">
          La coloc, en mieux.
        </Text>
        <Text className="mt-6 text-center text-xl font-semibold text-foreground">Creer un compte</Text>

        <View className="mt-6 gap-2">
          <Text className="mt-2 text-sm font-medium text-foreground">Nom</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="Votre nom"
            placeholderTextColor="#8B7E74"
          />

          <Text className="mt-2 text-sm font-medium text-foreground">Adresse email</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="email@exemple.com"
            placeholderTextColor="#8B7E74"
          />

          <Text className="mt-2 text-sm font-medium text-foreground">Mot de passe</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimum 8 caracteres"
            placeholderTextColor="#8B7E74"
          />

          {error && <Text className="mt-1 text-sm text-destructive">{error}</Text>}

          <Pressable
            className="mt-4 items-center rounded-button bg-primary py-3.5"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-primary-foreground">S'inscrire</Text>
            )}
          </Pressable>
        </View>

        <View className="my-6 flex-row items-center">
          <View className="h-px flex-1 bg-border" />
          <Text className="mx-3 text-sm text-muted-foreground">ou</Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <Pressable
          className="items-center rounded-button bg-[#1877F2] py-3.5"
          onPress={handleFacebookSignup}
        >
          <Text className="text-base font-semibold text-white">S'inscrire avec Facebook</Text>
        </Pressable>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted-foreground">Deja un compte ? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary">Se connecter</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
