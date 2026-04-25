import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc'

export default function SettingsScreen() {
  const { data: profile } = useQuery(orpc.user.me.queryOptions())
  const avatarUrl = (profile as any)?.avatar || (profile as any)?.image

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} contentFit="cover" transition={200} />
      ) : (
        <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
          {profile?.name ? (
            <Text className="text-3xl font-bold text-primary">{profile.name.charAt(0).toUpperCase()}</Text>
          ) : (
            <Feather name="settings" size={36} color="#FF6B35" />
          )}
        </View>
      )}
      <Text className="mt-6 text-xl font-semibold text-foreground">Paramètres</Text>
      <Text className="mt-2 text-center text-base text-muted-foreground">
        Les paramètres seront bientôt disponibles. Notifications, langue et gestion du compte.
      </Text>
    </View>
  )
}
