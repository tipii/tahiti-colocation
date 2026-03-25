import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { orpc, client } from '@/lib/orpc'
import { pickImage, uploadImage } from '@/lib/upload'

export default function EditProfileScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const { data: profile, isLoading } = useQuery({
    ...orpc.user.me.queryOptions(),
    select: (p: any) => {
      if (!initialized) {
        setName(p.name)
        setBio(p.bio ?? '')
        setInitialized(true)
      }
      return p
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => client.user.update({ name, bio: bio || null }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: orpc.user.key() })
      Alert.alert('Succès', 'Profil mis à jour')
      router.back()
    },
    onError: () => Alert.alert('Erreur', 'Impossible de mettre à jour le profil'),
  })

  const removeAvatarMutation = useMutation({
    mutationFn: () => client.user.removeAvatar(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.user.key() }),
  })

  const handlePickAvatar = async () => {
    const asset = await pickImage()
    if (!asset || !profile) return

    setUploadingAvatar(true)
    try {
      const result = await uploadImage('avatar', profile.id, asset)
      await client.user.updateAvatar({ avatarUrl: result.mediumUrl ?? result.thumbnailUrl ?? '' })
      queryClient.invalidateQueries({ queryKey: orpc.user.key() })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {
      Alert.alert('Erreur', "Impossible de changer la photo")
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (isLoading || !profile) {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#FF6B35" /></View>
  }

  // Priority: avatar (custom upload) > image (Facebook) > initial
  const avatarUrl = profile.avatar || profile.image
  const isFacebookImage = !profile.avatar && !!profile.image

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      {/* Avatar */}
      <View className="items-center">
        <Pressable onPress={handlePickAvatar} accessibilityLabel="Changer la photo de profil" className="relative">
          {uploadingAvatar ? (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-muted">
              <ActivityIndicator color="#FF6B35" />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} contentFit="cover" transition={200} />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-accent">
              <Text className="text-3xl font-bold text-primary">{profile.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Feather name="camera" size={14} color="#fff" />
          </View>
        </Pressable>

        {isFacebookImage && (
          <Text className="mt-2 text-xs text-muted-foreground">Photo importée de Facebook</Text>
        )}

        {avatarUrl && (
          <Pressable className="mt-2" onPress={() => {
            Alert.alert('Supprimer la photo', 'Revenir à la photo par défaut ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer', style: 'destructive', onPress: () => removeAvatarMutation.mutate() },
            ])
          }}>
            <Text className="text-sm text-destructive">Supprimer la photo</Text>
          </Pressable>
        )}
      </View>

      {/* Form */}
      <View className="mt-8 gap-4">
        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Nom</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            value={name}
            onChangeText={setName}
            placeholder="Votre nom"
            placeholderTextColor="#8B7E74"
            accessibilityLabel="Nom"
          />
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Bio</Text>
          <TextInput
            className="rounded-input border border-border bg-card px-4 py-3 text-base text-foreground"
            value={bio}
            onChangeText={setBio}
            placeholder="Parlez de vous..."
            placeholderTextColor="#8B7E74"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 100 }}
            maxLength={300}
            accessibilityLabel="Bio"
          />
          <Text className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/300</Text>
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-foreground">Email</Text>
          <View className="flex-row items-center rounded-input border border-border bg-muted px-4 py-3">
            <Text className="text-base text-muted-foreground">{profile.email}</Text>
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">L'email ne peut pas être modifié</Text>
        </View>
      </View>

      {/* Save */}
      <Pressable
        className={`mt-8 items-center rounded-button bg-primary py-3.5 ${saveMutation.isPending ? 'opacity-50' : ''}`}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        accessibilityLabel="Enregistrer les modifications"
      >
        {saveMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-primary-foreground">Enregistrer</Text>
        )}
      </Pressable>
    </View>
  )
}
