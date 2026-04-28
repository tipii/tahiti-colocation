'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LISTING_TYPES, LISTING_TYPE_LABELS, ROOM_TYPES, ROOM_TYPE_LABELS, HOUSING_TYPES, HOUSING_TYPE_LABELS, DEFAULT_COUNTRY } from '@coloc/shared/constants'
import type { ListingType, RoomType, HousingType } from '@coloc/shared/constants'

import { orpc, client } from '@/lib/orpc'
import { uploadImage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

export default function NewListingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])

  const [selectedRegion, setSelectedRegion] = useState<string>('tahiti')

  const { data: regionOptions = [] } = useQuery(orpc.geo.regions.queryOptions({
    input: { country: DEFAULT_COUNTRY },
    staleTime: 60 * 60 * 1000,
  }))

  const { data: cityOptions = [] } = useQuery(orpc.geo.cities.queryOptions({
    input: { country: DEFAULT_COUNTRY, region: selectedRegion },
    staleTime: 60 * 60 * 1000,
  }))

  const { data: amenityCatalog = [] } = useQuery(orpc.meta.amenities.queryOptions({
    staleTime: 60 * 60 * 1000,
  }))

  const form = useForm({
    defaultValues: {
      title: '', description: '', price: 0,
      listingType: 'colocation' as ListingType,
      availableFrom: '', availableTo: '',
      region: 'tahiti', city: 'papeete',
      roomType: 'single' as RoomType, roommateCount: 1,
      housingType: 'appartement' as HousingType,
      amenities: [] as string[],
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const v = form.state.values
      const created = await client.listing.create({
        ...v, price: Number(v.price),
        availableFrom: new Date(v.availableFrom),
        availableTo: v.availableTo ? new Date(v.availableTo) : null,
        status: publish ? 'published' : 'draft',
      })
      for (const photo of photos) {
        await uploadImage('listing', created.id, photo.file)
      }
      if (publish) await client.listing.publish({ id: created.id })
      return created
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: orpc.listing.key() })
      router.push(`/listings/${created.slug}`)
    },
  })

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold">Nouvelle annonce</h1>
      <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(true) }} className="mt-6 space-y-8">
        {/* Photos */}
        <section>
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Photos</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.preview} className="h-24 w-24 rounded-lg object-cover" />
                <button type="button" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}>x</button>
              </div>
            ))}
            <button type="button" className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed text-2xl text-muted-foreground hover:bg-muted" onClick={() => fileInputRef.current?.click()}>+</button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) setPhotos((prev) => [...prev, ...Array.from(e.target.files!).map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]) }} />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Informations generales</h2>
          <form.Field name="title">{(f) => <div><label className="text-sm font-medium">Titre</label><Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="Chambre dans colocation a Papeete" className="mt-1" /></div>}</form.Field>
          <form.Field name="description">{(f) => <div><label className="text-sm font-medium">Description</label><Textarea value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} rows={5} className="mt-1" /></div>}</form.Field>
          <form.Field name="price">{(f) => <div><label className="text-sm font-medium">Prix (XPF/mois)</label><Input type="number" value={f.state.value || ''} onChange={(e) => f.handleChange(Number(e.target.value))} className="mt-1" /></div>}</form.Field>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Duree</h2>
          <form.Field name="listingType">{(f) => <div className="flex gap-2">{LISTING_TYPES.map((dt) => <Button key={dt} type="button" size="sm" variant={f.state.value === dt ? 'default' : 'outline'} onClick={() => f.handleChange(dt)}>{LISTING_TYPE_LABELS[dt]}</Button>)}</div>}</form.Field>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="availableFrom">{(f) => <div><label className="text-sm font-medium">Disponible a partir du</label><Input type="date" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="mt-1" /></div>}</form.Field>
            <form.Field name="availableTo">{(f) => <div><label className="text-sm font-medium">Jusqu'au (optionnel)</label><Input type="date" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="mt-1" /></div>}</form.Field>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Localisation</h2>
          <form.Field name="region">{(f) => <div><label className="text-sm font-medium">Île</label><div className="mt-1 flex flex-wrap gap-2">{regionOptions.map((r) => <Button key={r.code} type="button" size="sm" variant={f.state.value === r.code ? 'default' : 'outline'} onClick={() => { f.handleChange(r.code); setSelectedRegion(r.code); form.setFieldValue('city', '') }}>{r.label}</Button>)}</div></div>}</form.Field>
          <form.Field name="city">{(f) => <div><label className="text-sm font-medium">Commune</label><div className="mt-1 flex flex-wrap gap-2">{cityOptions.map((c) => <Button key={c.code} type="button" size="sm" variant={f.state.value === c.code ? 'default' : 'outline'} onClick={() => f.handleChange(c.code)}>{c.label}</Button>)}</div></div>}</form.Field>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Type de logement</h2>
          <form.Field name="housingType">{(f) => <div className="flex gap-2">{HOUSING_TYPES.map((ht) => <Button key={ht} type="button" size="sm" variant={f.state.value === ht ? 'default' : 'outline'} onClick={() => f.handleChange(ht)}>{HOUSING_TYPE_LABELS[ht]}</Button>)}</div>}</form.Field>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Logement pour</h2>
          <form.Field name="roomType">{(f) => <div className="flex gap-2">{ROOM_TYPES.map((rt) => <Button key={rt} type="button" size="sm" variant={f.state.value === rt ? 'default' : 'outline'} onClick={() => f.handleChange(rt)}>{ROOM_TYPE_LABELS[rt]}</Button>)}</div>}</form.Field>
          <form.Field name="roommateCount">{(f) => <div><label className="text-sm font-medium">Personnes déjà sur place</label><Input type="number" min={0} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))} className="mt-1 w-24" /><p className="mt-1 text-xs text-muted-foreground">Hors futur·e colocataire</p></div>}</form.Field>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Equipements</h2>
          <form.Field name="amenities">
            {(f) => (
              <div className="flex flex-wrap gap-2">
                {amenityCatalog.map((a) => {
                  const active = f.state.value.includes(a.code)
                  return (
                    <Button
                      key={a.code}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => f.handleChange(active ? f.state.value.filter((c) => c !== a.code) : [...f.state.value, a.code])}
                    >
                      {a.label}
                    </Button>
                  )
                })}
              </div>
            )}
          </form.Field>
        </section>

        <Separator />

        <div className="flex gap-3">
          <Button type="submit" disabled={submitMutation.isPending}>{submitMutation.isPending ? 'Publication...' : 'Publier'}</Button>
          <Button type="button" variant="outline" disabled={submitMutation.isPending} onClick={() => submitMutation.mutate(false)}>Enregistrer en brouillon</Button>
        </div>
      </form>
    </main>
  )
}
