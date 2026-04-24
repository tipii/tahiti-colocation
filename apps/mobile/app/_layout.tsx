import '../globals.css'

import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
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
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })
  const { isPending: sessionPending } = authClient.useSession()

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  const ready = fontsLoaded && !sessionPending

  // Keep native splash until fonts + session are resolved, then fade out
  useEffect(() => {
    if (ready) {
      SplashScreen.setOptions({ duration: 400, fade: true })
      SplashScreen.hideAsync()
    }
  }, [ready])

  if (!ready) {
    // In Expo Go: native splash is just Expo icon, so this JS screen shows during loading
    // In production builds: native splash covers this entirely, user never sees it
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF8F0', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="home" size={64} color="#FF6B35" />
        <Text style={{ marginTop: 16, fontSize: 32, fontWeight: '700', color: '#FF6B35' }}>Coloc</Text>
        <Text style={{ marginTop: 6, fontSize: 14, color: '#8B7E74' }}>Colocation en Polynésie</Text>
        <ActivityIndicator style={{ marginTop: 32 }} size="small" color="#FF6B35" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </KeyboardProvider>
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
        <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="listing/edit/[id]" options={{ headerShown: true, title: 'Modifier', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="listing/apply/[id]" options={{ headerShown: true, title: 'Postuler', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="listing/candidatures/[id]" options={{ headerShown: true, title: 'Candidatures', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/messages" options={{ headerShown: true, title: 'Mes candidatures', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/listings" options={{ headerShown: true, title: 'Mes annonces', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/favorites" options={{ headerShown: true, title: 'Favoris', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: true, title: 'Modifier le profil', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="profile/settings" options={{ headerShown: true, title: 'Parametres', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="candidature/[id]" options={{ headerShown: true, title: 'Candidature', headerTintColor: '#FF6B35' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  )
}
