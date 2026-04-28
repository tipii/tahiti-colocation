import { FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { authClient } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'
import { ListingCard } from '@/components/ListingCard'
import { ListingSkeletonList } from '@/components/ListingCardSkeleton'
import { ProfileCompletionCard, useProfileCompletion } from '@/components/ProfileCompletion'

const HORIZONTAL_CARD_WIDTH = 280

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View className="mb-3 flex-row items-center justify-between px-6">
      <Text className="text-lg font-bold text-foreground">{title}</Text>
      {onPress && (
        <Pressable onPress={onPress} accessibilityRole="button">
          <Text className="text-sm font-medium text-primary">Voir tout ›</Text>
        </Pressable>
      )}
    </View>
  )
}

function HorizontalListings({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  if (isLoading) return <ListingSkeletonList />
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
      renderItem={({ item }) => (
        <View style={{ width: HORIZONTAL_CARD_WIDTH }}>
          <ListingCard listing={item} />
        </View>
      )}
    />
  )
}

function ActivitySummary({ mode, onPress }: { mode: 'seeker' | 'provider'; onPress: () => void }) {
  const { data: mineCandidatures = [] } = useQuery({
    ...orpc.candidature.mine.queryOptions(),
    enabled: mode === 'seeker',
  })
  const { data: received } = useQuery({
    ...orpc.candidature.receivedSummary.queryOptions(),
    enabled: mode === 'provider',
  })

  if (mode === 'seeker') {
    const active = mineCandidatures.filter((c: any) => c.status === 'pending' || c.status === 'accepted')
    const accepted = mineCandidatures.filter((c: any) => c.status === 'accepted')
    return (
      <Pressable
        className="flex-row items-center justify-between rounded-card bg-card p-4 shadow-sm"
        onPress={onPress}
        accessibilityRole="button"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
            <Feather name="send" size={18} color="#FF6B35" />
          </View>
          <View>
            <Text className="text-base font-semibold text-foreground">
              {active.length === 0
                ? 'Aucune candidature en cours'
                : `${active.length} candidature${active.length > 1 ? 's' : ''} en cours`}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {accepted.length > 0 ? `${accepted.length} acceptée${accepted.length > 1 ? 's' : ''} 🎉` : 'Suis tes demandes'}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#8B7E74" />
      </Pressable>
    )
  }

  // Provider
  const total = received?.total ?? 0
  const pending = received?.pending ?? 0
  return (
    <Pressable
      className="flex-row items-center justify-between rounded-card bg-card p-4 shadow-sm"
      onPress={onPress}
      accessibilityRole="button"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
          <Feather name="inbox" size={18} color="#FF6B35" />
        </View>
        <View>
          <Text className="text-base font-semibold text-foreground">
            {total === 0 ? 'Aucune candidature reçue' : `${total} candidature${total > 1 ? 's' : ''} reçue${total > 1 ? 's' : ''}`}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {pending > 0 ? `${pending} en attente de réponse` : 'Tu es à jour'}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color="#8B7E74" />
    </Pressable>
  )
}

export default function HomeScreen() {
  const { data: session } = authClient.useSession()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { completion, missing } = useProfileCompletion()

  const { data: profile } = useQuery({
    ...orpc.user.me.queryOptions(),
    enabled: !!session,
  })
  const mode: 'seeker' | 'provider' = (profile?.mode as 'provider' | 'seeker' | undefined) ?? 'seeker'

  const { data: newestData, isLoading: newestLoading } = useQuery({
    queryKey: ['listings', 'home-newest'],
    queryFn: () => client.listing.list({ page: 1, limit: 10 }),
    staleTime: 60_000,
  })
  const newest = newestData?.data ?? []

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    ...orpc.favorite.list.queryOptions(),
    enabled: !!session,
  })

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 60 }}
    >
      {/* Header */}
      <View className="px-6 pb-4">
        <Text className="text-3xl font-bold text-foreground">Coolive</Text>
        {session && (
          <Text className="mt-1 text-base text-muted-foreground">
            Ia ora na, {session.user.name} 🌺
          </Text>
        )}
        <Text className="mt-3 text-lg italic font-medium text-secondary">
          Trouve ta coloc au paradis
        </Text>
      </View>

      {/* Profile completion banner */}
      {session && completion < 100 && (
        <View className="px-6 pb-3">
          <ProfileCompletionCard
            completion={completion}
            missing={missing}
            variant="banner"
            onPress={() => router.push('/profile/edit' as any)}
          />
        </View>
      )}

      {/* Activity summary — mode-dependent */}
      {session && (
        <View className="px-6 pb-5">
          <ActivitySummary
            mode={mode}
            onPress={() => router.push((mode === 'seeker' ? '/(tabs)/candidatures' : '/(tabs)/listings') as any)}
          />
        </View>
      )}

      {/* New listings — horizontal scroll */}
      <View className="pb-6">
        <SectionHeader title="Nouveautés" onPress={() => router.push('/(tabs)/search' as any)} />
        <HorizontalListings data={newest} isLoading={newestLoading} />
      </View>

      {/* Favorites — horizontal scroll, or CTA if empty */}
      {session && (
        <View className="pb-8">
          <SectionHeader
            title="Coups de cœur"
            onPress={favorites.length > 0 ? () => router.push('/profile/favorites' as any) : undefined}
          />
          {favoritesLoading ? (
            <ListingSkeletonList />
          ) : favorites.length > 0 ? (
            <HorizontalListings data={favorites} isLoading={false} />
          ) : (
            <View className="mx-6 items-center rounded-card bg-card p-6">
              <Feather name="heart" size={28} color="#FF6B35" />
              <Text className="mt-3 text-center text-base font-semibold text-foreground">
                Pas encore de coup de cœur
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Explore les annonces et touche le ❤️ pour les retrouver ici.
              </Text>
              <Pressable
                className="mt-4 flex-row items-center gap-2 rounded-pill bg-primary px-5 py-2.5"
                onPress={() => router.push('/(tabs)/search' as any)}
                accessibilityRole="button"
                accessibilityLabel="Rechercher des annonces"
              >
                <Feather name="search" size={14} color="#fff" />
                <Text className="text-sm font-semibold text-primary-foreground">Découvrir des annonces</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}
