import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { authClient } from '@/lib/auth'
import { orpc, client } from '@/lib/orpc'

export default function SettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useQuery(orpc.user.me.queryOptions())
  const avatarUrl = (profile as any)?.avatar || (profile as any)?.image

  const resendM = useMutation({
    mutationFn: () => authClient.sendVerificationEmail({ email: profile!.email }),
    onSuccess: () => Alert.alert('Email envoyé', 'Vérifie ta boîte mail (et le dossier spam).'),
    onError: () => Alert.alert('Erreur', "Impossible de renvoyer l'email"),
  })

  const exportM = useMutation({
    mutationFn: () => client.user.exportData(),
    onSuccess: async (data) => {
      try {
        const filename = `coolive-export-${new Date().toISOString().slice(0, 10)}.json`
        const file = new File(Paths.cache, filename)
        file.create({ overwrite: true })
        file.write(JSON.stringify(data, null, 2))
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Mes données Coolive' })
        } else {
          Alert.alert('Export prêt', `Fichier sauvegardé: ${file.uri}`)
        }
      } catch (e: any) {
        Alert.alert('Erreur', e.message ?? 'Impossible de sauvegarder le fichier')
      }
    },
    onError: () => Alert.alert('Erreur', "Impossible d'exporter les données"),
  })

  const deleteM = useMutation({
    mutationFn: () => client.user.deleteAccount(),
    onSuccess: async () => {
      queryClient.clear()
      await authClient.signOut()
      router.replace('/(auth)/login')
    },
    onError: () => Alert.alert('Erreur', 'Impossible de supprimer le compte'),
  })

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes tes annonces, candidatures, favoris et photos seront supprimés. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteM.mutate() },
      ],
    )
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      <View className="items-center">
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
        {profile?.name && <Text className="mt-3 text-lg font-semibold text-foreground">{profile.name}</Text>}
        {profile?.email && <Text className="text-sm text-muted-foreground">{profile.email}</Text>}
      </View>

      {profile && !profile.emailVerified && (
        <View className="mt-6 rounded-card bg-accent/40 p-4">
          <Text className="text-sm font-semibold text-foreground">Email non confirmé</Text>
          <Text className="mt-1 text-sm text-muted-foreground">Confirme {profile.email} pour pouvoir postuler ou publier des annonces.</Text>
          <Pressable className="mt-3 items-center rounded-button bg-primary py-2.5" onPress={() => resendM.mutate()} disabled={resendM.isPending}>
            <Text className="text-sm font-semibold text-primary-foreground">{resendM.isPending ? 'Envoi…' : "Renvoyer l'email de confirmation"}</Text>
          </Pressable>
        </View>
      )}

      <View className="mt-8 gap-3">
        <Text className="text-xs font-semibold uppercase text-muted-foreground">Mes données</Text>
        <Pressable
          className={`flex-row items-center justify-between rounded-card bg-card px-4 py-3.5 ${exportM.isPending ? 'opacity-50' : ''}`}
          onPress={() => exportM.mutate()}
          disabled={exportM.isPending}
        >
          <View className="flex-row items-center gap-3">
            <Feather name="download" size={20} color="#0D9488" />
            <Text className="text-base text-foreground">Télécharger mes données</Text>
          </View>
          {exportM.isPending ? <ActivityIndicator color="#0D9488" /> : <Feather name="chevron-right" size={18} color="#8B7E74" />}
        </Pressable>
      </View>

      <View className="mt-8 gap-3">
        <Text className="text-xs font-semibold uppercase text-destructive">Zone dangereuse</Text>
        <Pressable
          className={`flex-row items-center justify-between rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3.5 ${deleteM.isPending ? 'opacity-50' : ''}`}
          onPress={confirmDelete}
          disabled={deleteM.isPending}
        >
          <View className="flex-row items-center gap-3">
            <Feather name="trash-2" size={20} color="#EF4444" />
            <Text className="text-base font-medium text-destructive">Supprimer mon compte</Text>
          </View>
          {deleteM.isPending ? <ActivityIndicator color="#EF4444" /> : <Feather name="chevron-right" size={18} color="#EF4444" />}
        </Pressable>
        <Text className="text-xs text-muted-foreground">Action définitive. Toutes tes données seront effacées.</Text>
      </View>
    </ScrollView>
  )
}
