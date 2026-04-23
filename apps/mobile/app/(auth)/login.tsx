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
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'

import { authClient } from '@/lib/auth'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-center text-3xl font-bold text-primary">Coloc Tahiti</Text>
        <Text className="mt-1 text-center text-base text-secondary italic">
          La coloc au paradis 🌴
        </Text>
        <Text className="mt-6 text-center text-xl font-semibold text-foreground">Connexion</Text>

        <View className="mt-6 gap-2">
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
          <View className="relative">
            <TextInput
              className="rounded-input border border-border bg-card px-4 py-3 pr-12 text-base text-foreground"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Votre mot de passe"
              placeholderTextColor="#8B7E74"
            />
            <Pressable
              className="absolute right-3 top-0 h-full justify-center px-1"
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8B7E74" />
            </Pressable>
          </View>

          {error && <Text className="mt-1 text-sm text-destructive">{error}</Text>}

          <Pressable
            className="mt-4 items-center rounded-button bg-primary py-3.5"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-primary-foreground">Se connecter</Text>
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
          onPress={handleFacebookLogin}
        >
          <Text className="text-base font-semibold text-white">
            Continuer avec Facebook
          </Text>
        </Pressable>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted-foreground">Pas encore de compte ? </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary">S'inscrire</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
