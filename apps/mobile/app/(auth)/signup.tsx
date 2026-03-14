import { useState } from 'react'
import {
  ActivityIndicator,
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
  const [role, setRole] = useState<'seeker' | 'provider'>('seeker')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    const result = await authClient.signUp.email({
      email,
      password,
      name,
      role,
    } as Parameters<typeof authClient.signUp.email>[0] & { role: string })
    if (result.error) {
      setError(result.error.message ?? 'Une erreur est survenue')
      setLoading(false)
    } else {
      router.replace('/(tabs)')
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
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <Text className="text-center text-3xl font-bold">Creer un compte</Text>
        <Text className="mt-2 text-center text-base text-gray-500">
          Rejoignez Coloc et trouvez votre colocation
        </Text>

        <View className="mt-8 gap-2">
          <Text className="mt-2 text-sm font-medium">Nom</Text>
          <TextInput
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="Votre nom"
          />

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
            placeholder="Minimum 8 caracteres"
          />

          <Text className="mt-2 text-sm font-medium">Je suis...</Text>
          <View className="mt-1 flex-row gap-2">
            <Pressable
              className={`flex-1 items-center rounded-lg border py-2.5 ${
                role === 'seeker' ? 'border-black bg-black' : 'border-gray-300'
              }`}
              onPress={() => setRole('seeker')}
            >
              <Text className={`text-sm font-medium ${role === 'seeker' ? 'text-white' : 'text-black'}`}>
                Je cherche
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-lg border py-2.5 ${
                role === 'provider' ? 'border-black bg-black' : 'border-gray-300'
              }`}
              onPress={() => setRole('provider')}
            >
              <Text className={`text-sm font-medium ${role === 'provider' ? 'text-white' : 'text-black'}`}>
                Je propose
              </Text>
            </Pressable>
          </View>

          {error && <Text className="mt-1 text-sm text-red-600">{error}</Text>}

          <Pressable
            className="mt-4 items-center rounded-lg bg-black py-3"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">S'inscrire</Text>
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
          onPress={handleFacebookSignup}
        >
          <Text className="text-base font-semibold text-white">S'inscrire avec Facebook</Text>
        </Pressable>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-500">Deja un compte ? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-black">Se connecter</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
