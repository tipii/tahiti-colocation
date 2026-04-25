import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'

import { authClient } from '@/lib/auth'
import { orpc } from '@/lib/orpc'

export default function TabLayout() {
  const { data: session } = authClient.useSession()

  const { data: profile } = useQuery({
    ...orpc.user.me.queryOptions(),
    enabled: !!session,
  })

  const mode = (profile as any)?.mode ?? 'seeker'
  const isSeeker = mode === 'seeker'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#8B7E74',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8DDD3',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} />,
          href: isSeeker ? '/search' : null,
        }}
      />
      <Tabs.Screen
        name="candidatures"
        options={{
          title: 'Candidatures',
          tabBarIcon: ({ color, size }) => <Feather name="send" color={color} size={size} />,
          href: isSeeker ? '/candidatures' : null,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Annonces',
          tabBarIcon: ({ color, size }) => <Feather name="list" color={color} size={size} />,
          href: !isSeeker ? '/listings' : null,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Publier',
          tabBarIcon: ({ color, size }) => <Feather name="plus-circle" color={color} size={size} />,
          href: !isSeeker ? '/create' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
