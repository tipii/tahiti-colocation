import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'

import { authClient } from '@/lib/auth'

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable className="flex-row items-center justify-between rounded-card bg-card px-4 py-3.5" onPress={onPress}>
      <View className="flex-row items-center gap-3">
        <Feather name={icon as any} size={20} color="#0D9488" />
        <Text className="text-base text-foreground">{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#8B7E74" />
    </Pressable>
  )
}

export default function ProfileScreen() {
  const { data: session } = authClient.useSession()
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      {session && (
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Text className="text-xl font-bold text-primary">
              {session.user.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-xl font-semibold text-foreground">{session.user.name}</Text>
            <Text className="text-sm text-muted-foreground">{session.user.email}</Text>
          </View>
        </View>
      )}

      <View className="mt-8 gap-2">
        <MenuItem icon="list" label="Mes annonces" onPress={() => router.push('/profile/listings' as any)} />
        <MenuItem icon="heart" label="Favoris" onPress={() => router.push('/profile/favorites' as any)} />
        <MenuItem icon="edit-2" label="Modifier le profil" onPress={() => router.push('/profile/edit' as any)} />
        <MenuItem icon="settings" label="Parametres" onPress={() => router.push('/profile/settings' as any)} />
      </View>

      <Pressable className="mt-8 items-center rounded-button border border-destructive py-3" onPress={handleLogout}>
        <Text className="text-base font-medium text-destructive">Se deconnecter</Text>
      </Pressable>
    </View>
  )
}
