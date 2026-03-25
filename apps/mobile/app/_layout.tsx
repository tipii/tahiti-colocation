import '../globals.css'

import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { useColorScheme } from '@/components/useColorScheme'
import { authClient } from '@/lib/auth'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(auth)',
}

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const { data: session, isPending } = authClient.useSession()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, isPending, segments])

  const warmTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#FFF8F0',
      card: '#FFFFFF',
      text: '#2D2A26',
      border: '#E8DDD3',
      primary: '#FF6B35',
    },
  }

  return (
    <ThemeProvider value={warmTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: '', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="listing/edit/[id]" options={{ headerShown: true, title: 'Modifier', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/messages" options={{ headerShown: true, title: 'Messages', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/listings" options={{ headerShown: true, title: 'Mes annonces', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/favorites" options={{ headerShown: true, title: 'Favoris', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: true, title: 'Modifier le profil', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/settings" options={{ headerShown: true, title: 'Parametres', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Conversation', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  )
}
