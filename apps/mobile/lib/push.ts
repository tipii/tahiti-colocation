import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { client } from './orpc'

// Returns the Expo push token for this device, or null if:
//  - permission denied
//  - running in Expo Go (which can't receive pushes reliably)
//  - the EAS projectId is missing
export async function registerForPushNotifications(): Promise<string | null> {
  // Step 1 — Android channel.
  // Android requires apps to declare at least one notification channel before sending.
  // Channels group notifications by purpose (sound, vibration, importance).
  // We just declare a single "default" channel; we can split later if we want
  // separate "candidatures" / "messages" channels with different priorities.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    })
  }

  // Step 2 — check existing permission.
  // The OS persists permission decisions, so don't pop the dialog every launch.
  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status

  // Step 3 — ask for permission if not yet decided.
  // After "denied", iOS won't let us re-prompt — user has to go to Settings.
  // We accept this silently and return null.
  if (status !== 'granted') {
    const result = await Notifications.requestPermissionsAsync()
    status = result.status
  }
  if (status !== 'granted') return null

  // Step 4 — get the Expo push token.
  // This identifies (device + app install + project) on Expo's relay.
  // The projectId comes from app.json's `extra.eas.projectId` (set by `eas init` earlier).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) {
    console.warn('Push: no EAS projectId, skipping token fetch')
    return null
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId })
    return tokenResponse.data
  } catch (e) {
    console.warn('Push: failed to fetch token', e)
    return null
  }
}

// Convenience wrapper: get the token, send it to the backend. Returns true on success.
// Silent on the happy path; warns on failure.
export async function syncPushToken(): Promise<boolean> {
  const token = await registerForPushNotifications()
  if (!token) return false
  try {
    await client.user.registerPushToken({ token })
    return true
  } catch (e) {
    console.warn('[push] backend register failed', e)
    return false
  }
}
