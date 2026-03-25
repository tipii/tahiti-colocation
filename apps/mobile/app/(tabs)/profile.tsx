import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'

function MenuItem({ icon, label, badge, onPress }: { icon: string; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable className="flex-row items-center justify-between rounded-card bg-card px-4 py-3.5" onPress={onPress} accessibilityLabel={badge ? `${label}, ${badge} non lus` : label} accessibilityRole="button">
      <View className="flex-row items-center gap-3">
        <Feather name={icon as any} size={20} color="#0D9488" />
        <Text className="text-base text-foreground">{label}</Text>
        {badge !== undefined && badge > 0 && (
          <View className="min-w-[20px] items-center rounded-full bg-primary px-1.5 py-0.5">
            <Text className="text-xs font-bold text-primary-foreground">{badge}</Text>
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={18} color="#8B7E74" />
    </Pressable>
  )
}

export default function ProfileScreen() {
  const { data: session } = authClient.useSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => client.user.me(),
    enabled: !!session,
  })

  const { data: unread } = useQuery({
    ...orpc.chat.unreadCount.queryOptions(),
    enabled: !!session,
    refetchInterval: 10000,
  })

  const mode = (profile as any)?.mode ?? 'seeker'
  const isSeeker = mode === 'seeker'

  const modeMutation = useMutation({
    mutationFn: (newMode: 'seeker' | 'provider') => client.user.setMode({ mode: newMode }),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })

  const handleLogout = async () => {
    await authClient.signOut()
    router.replace('/(auth)/login')
  }

  const avatarUrl = (profile as any)?.avatar || (profile as any)?.image

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 60 }}>
      {/* User info */}
      {session && (
        <View className="flex-row items-center gap-4">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} contentFit="cover" transition={200} />
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
              <Text className="text-xl font-bold text-primary">
                {session.user.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-xl font-semibold text-foreground">{(profile as any)?.name ?? session.user.name}</Text>
            <Text className="text-sm text-muted-foreground">{session.user.email}</Text>
          </View>
        </View>
      )}

      {/* Mode toggle */}
      <View className="mt-5 flex-row overflow-hidden rounded-pill border border-border bg-card">
        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 ${isSeeker ? 'bg-primary' : ''}`}
          onPress={() => modeMutation.mutate('seeker')}
          accessibilityLabel="Mode chercheur"
          accessibilityState={{ selected: isSeeker }}
        >
          <Feather name="search" size={16} color={isSeeker ? '#fff' : '#8B7E74'} />
          <Text className={`text-sm font-semibold ${isSeeker ? 'text-primary-foreground' : 'text-muted-foreground'}`}>Je cherche</Text>
        </Pressable>
        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 ${!isSeeker ? 'bg-primary' : ''}`}
          onPress={() => modeMutation.mutate('provider')}
          accessibilityLabel="Mode propriétaire"
          accessibilityState={{ selected: !isSeeker }}
        >
          <Feather name="home" size={16} color={!isSeeker ? '#fff' : '#8B7E74'} />
          <Text className={`text-sm font-semibold ${!isSeeker ? 'text-primary-foreground' : 'text-muted-foreground'}`}>Je propose</Text>
        </Pressable>
      </View>

      {/* Menu */}
      <View className="mt-6 gap-2">
        <MenuItem icon="heart" label="Favoris" onPress={() => router.push('/profile/favorites' as any)} />
        {(unread?.count ?? 0) > 0 && (
          <MenuItem icon="message-circle" label="Messages" badge={unread?.count} onPress={() => router.push('/profile/messages' as any)} />
        )}
        <MenuItem icon="edit-2" label="Modifier le profil" onPress={() => router.push('/profile/edit' as any)} />
        <MenuItem icon="settings" label="Paramètres" onPress={() => router.push('/profile/settings' as any)} />
      </View>

      <Pressable className="mt-8 items-center rounded-button border border-destructive py-3" onPress={handleLogout} accessibilityLabel="Se déconnecter" accessibilityRole="button">
        <Text className="text-base font-medium text-destructive">Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  )
}
