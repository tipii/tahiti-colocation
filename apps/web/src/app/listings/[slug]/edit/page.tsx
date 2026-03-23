'use client'

import { useParams, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ISLANDS, DURATION_TYPES, DURATION_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS } from '@coloc/shared/constants'
import type { DurationType, Island, RoomType } from '@coloc/shared/constants'
import type { Image as ImageType } from '@coloc/shared/types'

import { orpc, client } from '@/lib/orpc'
import { uploadImage, deleteImage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

export default function EditListingPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [existingImages, setExistingImages] = useState<ImageType[]>([])
  const [initialized, setInitialized] = useState(false)

  const { data: listing, isLoading } = useQuery(
    orpc.listing.get.queryOptions({ input: { idOrSlug: slug } }),
  )

  const form = useForm({
    defaultValues: {
      title: '', description: '', price: 0,
      durationType: 'long_terme' as DurationType,
      availableFrom: '', availableTo: '',
      island: 'Tahiti' as Island, commune: '',
      roomType: 'single' as RoomType, numberOfPeople: 1,
      privateBathroom: false, privateToilets: false, pool: false,
      parking: false, airConditioning: false, petsAccepted: false,
      showPhone: false, contactEmail: '',
    },
  })

  if (listing && !initialized) {
    const l = listing as any
    form.setFieldValue('title', l.title)
    form.setFieldValue('description', l.description)
    form.setFieldValue('price', l.price)
    form.setFieldValue('durationType', l.durationType)
    form.setFieldValue('availableFrom', new Date(l.availableFrom).toISOString().split('T')[0])
    form.setFieldValue('availableTo', l.availableTo ? new Date(l.availableTo).toISOString().split('T')[0] : '')
    form.setFieldValue('island', l.island)
    form.setFieldValue('commune', l.commune)
    form.setFieldValue('roomType', l.roomType)
    form.setFieldValue('numberOfPeople', l.numberOfPeople)
    form.setFieldValue('privateBathroom', l.privateBathroom)
    form.setFieldValue('privateToilets', l.privateToilets)
    form.setFieldValue('pool', l.pool)
    form.setFieldValue('parking', l.parking)
    form.setFieldValue('airConditioning', l.airConditioning)
    form.setFieldValue('petsAccepted', l.petsAccepted)
    form.setFieldValue('showPhone', l.showPhone)
    form.setFieldValue('contactEmail', l.contactEmail ?? '')
    setExistingImages(l.images ?? [])
    setInitialized(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const v = form.state.values
      return client.listing.update({
        id: listing!.id, ...v,
        availableFrom: new Date(v.availableFrom),
        availableTo: v.availableTo ? new Date(v.availableTo) : null,
        contactEmail: v.contactEmail || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
      router.push(`/listings/${slug}`)
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => client.listing.publish({ id: listing!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
      router.push(`/listings/${slug}`)
    },
  })

  const handleAddPhotos = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const result = await uploadImage('listing', listing!.id, file)
        setExistingImages((prev) => [...prev, { id: result.id, originalUrl: result.mediumUrl, mediumUrl: result.mediumUrl, thumbnailUrl: result.thumbnailUrl, sortOrder: prev.length }])
      } catch {}
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    await deleteImage(imageId)
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Chargement...</div>
  if (!listing) return <div className="py-20 text-center text-muted-foreground">Annonce introuvable</div>

  const isPending = saveMutation.isPending || publishMutation.isPending

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold">Modifier l'annonce</h1>
      <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="mt-6 space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Photos</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {existingImages.map((img) => (
              <div key={img.id} className="relative">
                <img src={img.thumbnailUrl ?? img.mediumUrl ?? ''} className="h-24 w-24 rounded-lg object-cover" />
                <button type="button" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white" onClick={() => handleDeleteImage(img.id)}>x</button>
              </div>
            ))}
            <button type="button" className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed text-2xl text-muted-foreground hover:bg-muted" onClick={() => fileInputRef.current?.click()}>+</button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && handleAddPhotos(e.target.files)} />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Informations generales</h2>
          <form.Field name="title">{(f) => <div><label className="text-sm font-medium">Titre</label><Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="mt-1" /></div>}</form.Field>
          <form.Field name="description">{(f) => <div><label className="text-sm font-medium">Description</label><Textarea value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} rows={5} className="mt-1" /></div>}</form.Field>
          <form.Field name="price">{(f) => <div><label className="text-sm font-medium">Prix (XPF/mois)</label><Input type="number" value={f.state.value || ''} onChange={(e) => f.handleChange(Number(e.target.value))} className="mt-1" /></div>}</form.Field>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Duree</h2>
          <form.Field name="durationType">{(f) => <div className="flex gap-2">{DURATION_TYPES.map((dt) => <Button key={dt} type="button" size="sm" variant={f.state.value === dt ? 'default' : 'outline'} onClick={() => f.handleChange(dt)}>{DURATION_LABELS[dt]}</Button>)}</div>}</form.Field>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="availableFrom">{(f) => <div><label className="text-sm font-medium">Disponible a partir du</label><Input type="date" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="mt-1" /></div>}</form.Field>
            <form.Field name="availableTo">{(f) => <div><label className="text-sm font-medium">Jusqu'au (optionnel)</label><Input type="date" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="mt-1" /></div>}</form.Field>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Localisation</h2>
          <form.Field name="island">{(f) => <div className="flex flex-wrap gap-2">{ISLANDS.map((i) => <Button key={i} type="button" size="sm" variant={f.state.value === i ? 'default' : 'outline'} onClick={() => f.handleChange(i)}>{i}</Button>)}</div>}</form.Field>
          <form.Field name="commune">{(f) => <div><label className="text-sm font-medium">Commune</label><Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="mt-1" /></div>}</form.Field>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Logement</h2>
          <form.Field name="roomType">{(f) => <div className="flex gap-2">{ROOM_TYPES.map((rt) => <Button key={rt} type="button" size="sm" variant={f.state.value === rt ? 'default' : 'outline'} onClick={() => f.handleChange(rt)}>{ROOM_TYPE_LABELS[rt]}</Button>)}</div>}</form.Field>
          <form.Field name="numberOfPeople">{(f) => <div><label className="text-sm font-medium">Nombre de personnes</label><Input type="number" min={1} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))} className="mt-1 w-24" /></div>}</form.Field>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Equipements</h2>
          {([['privateBathroom', 'Salle de bain privee'], ['privateToilets', 'Toilettes privees'], ['pool', 'Piscine'], ['parking', 'Parking'], ['airConditioning', 'Climatisation'], ['petsAccepted', 'Animaux acceptes']] as const).map(([name, label]) => (
            <form.Field key={name} name={name}>{(f) => <div className="flex items-center justify-between"><label className="text-sm">{label}</label><Switch checked={f.state.value} onCheckedChange={(v) => f.handleChange(v)} /></div>}</form.Field>
          ))}
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Contact</h2>
          <form.Field name="showPhone">{(f) => <div className="flex items-center justify-between"><label className="text-sm">Afficher mon telephone</label><Switch checked={f.state.value} onCheckedChange={(v) => f.handleChange(v)} /></div>}</form.Field>
          <form.Field name="contactEmail">{(f) => <div><label className="text-sm font-medium">Email de contact (optionnel)</label><Input type="email" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="mt-1" /></div>}</form.Field>
        </section>

        <Separator />

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>{saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>
          {listing.status === 'draft' && <Button type="button" variant="outline" disabled={isPending} onClick={() => publishMutation.mutate()}>Publier</Button>}
        </div>
      </form>
    </main>
  )
}
