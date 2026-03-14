import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { authClient } from '@/lib/auth'

export default function ProfileScreen() {
  const { data: session } = authClient.useSession()
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-3xl font-bold">Profil</Text>
      {session && (
        <View className="mt-6 gap-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Text className="text-2xl font-bold text-gray-400">
              {session.user.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="gap-1">
            <Text className="text-xl font-semibold">{session.user.name}</Text>
            <Text className="text-base text-gray-500">{session.user.email}</Text>
          </View>
          <Pressable
            className="mt-6 items-center rounded-lg bg-red-500 py-3"
            onPress={handleLogout}
          >
            <Text className="text-base font-semibold text-white">Se deconnecter</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
