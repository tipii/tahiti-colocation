import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'

import { authClient } from '@/lib/auth'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    const result = await authClient.signIn.email({ email, password })
    if (result.error) {
      setError(result.error.message ?? 'Une erreur est survenue')
      setLoading(false)
    } else {
      router.replace('/(tabs)')
    }
  }

  const handleFacebookLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await WebBrowser.dismissAuthSession()
    } catch {}
    try {
      const res = await authClient.signIn.social({
        provider: 'facebook',
        callbackURL: '/(tabs)',
      })
      if (res.error) {
        setError(res.error.message ?? 'Erreur Facebook')
      } else {
        router.replace('/(tabs)')
      }
    } catch (e) {
      console.error('Facebook login error:', e)
      setError('Erreur de connexion')
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-center text-3xl font-bold">Connexion</Text>
        <Text className="mt-2 text-center text-base text-gray-500">
          Connectez-vous a votre compte Coloc
        </Text>

        <View className="mt-8 gap-2">
          <Text className="mt-2 text-sm font-medium">Adresse email</Text>
          <TextInput
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="email@exemple.com"
          />

          <Text className="mt-2 text-sm font-medium">Mot de passe</Text>
          <TextInput
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Votre mot de passe"
          />

          {error && <Text className="mt-1 text-sm text-red-600">{error}</Text>}

          <Pressable
            className="mt-4 items-center rounded-lg bg-black py-3"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Connexion</Text>
            )}
          </Pressable>
        </View>

        <View className="my-6 flex-row items-center">
          <View className="h-px flex-1 bg-gray-200" />
          <Text className="mx-3 text-sm text-gray-400">ou</Text>
          <View className="h-px flex-1 bg-gray-200" />
        </View>

        <Pressable
          className="items-center rounded-lg bg-[#1877F2] py-3"
          onPress={handleFacebookLogin}
        >
          <Text className="text-base font-semibold text-white">
            Connexion avec Facebook
          </Text>
        </Pressable>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-500">Pas encore de compte ? </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-black">S'inscrire</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
