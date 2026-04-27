import { relations, sql } from 'drizzle-orm'
import { boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import type {
  LISTING_TYPES,
  ROOM_TYPES,
  LISTING_STATUSES,
  OCCUPATIONS,
  SMOKER_CHOICES,
  PET_CHOICES,
  SCHEDULE_CHOICES,
  LANGUAGE_CHOICES,
} from '@coloc/contract'

type ListingType = (typeof LISTING_TYPES)[number]
type RoomType = (typeof ROOM_TYPES)[number]
type ListingStatus = (typeof LISTING_STATUSES)[number]
type Occupation = (typeof OCCUPATIONS)[number]
type SmokerChoice = (typeof SMOKER_CHOICES)[number]
type PetChoice = (typeof PET_CHOICES)[number]
type ScheduleChoice = (typeof SCHEDULE_CHOICES)[number]
type LanguageChoice = (typeof LANGUAGE_CHOICES)[number]

// ── Better Auth tables (generated) ──────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text('role').default('user'),
  mode: text('mode').default('seeker'),
  bio: text('bio'),
  avatar: text('avatar'),
  dob: date('dob'),
  phone: text('phone'),
  occupation: varchar('occupation', { length: 20 }).$type<Occupation>(),
  occupationDetail: text('occupation_detail'),
  languages: jsonb('languages').$type<LanguageChoice[]>(),
  smoker: varchar('smoker', { length: 10 }).$type<SmokerChoice>(),
  pets: varchar('pets', { length: 10 }).$type<PetChoice>(),
  schedule: varchar('schedule', { length: 10 }).$type<ScheduleChoice>(),
  whatsappOverride: text('whatsapp_override'),
  facebookUrl: text('facebook_url'),
  pushToken: text('push_token'),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  listings: many(listings),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

// ── Application tables ──────────────────────────────────────────────────────

// Geo reference: source of truth for listings.country / listings.region.
// Free-text columns on listings for now (no FK) — code is the same string we
// store there. Validation happens at the RPC handler.
export const countries = pgTable('countries', {
  code: varchar('code', { length: 2 }).primaryKey(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const regions = pgTable(
  'regions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    countryCode: varchar('country_code', { length: 2 }).notNull().references(() => countries.code, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('regions_country_idx').on(table.countryCode),
    index('regions_country_code_unique').on(table.countryCode, table.code),
  ],
)

// Curated amenity catalog. Listings store an array of amenity `code` slugs in
// `listings.amenities`; display labels + icons are resolved client-side via
// the `meta.amenities` RPC. Adding a new amenity = inserting a row.
export const amenities = pgTable('amenities', {
  code: varchar('code', { length: 50 }).primaryKey(),
  label: text('label').notNull(),
  // Feather icon name (kebab-case, e.g. 'wind', 'rotate-cw'). Web converts
  // to Lucide PascalCase ('Wind', 'RotateCw'); both libs share most names.
  icon: varchar('icon', { length: 50 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
})

// Curated communes with centroid coords. Listings store the city `code` (slug)
// in `listings.city`; display label is resolved server-side via JOIN.
export const cities = pgTable(
  'cities',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    regionCode: varchar('region_code', { length: 50 }).notNull(),
    code: varchar('code', { length: 100 }).notNull(),
    label: text('label').notNull(),
    latitude: text('latitude').notNull(),
    longitude: text('longitude').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('cities_region_idx').on(table.countryCode, table.regionCode),
    index('cities_country_region_code_unique').on(table.countryCode, table.regionCode, table.code),
  ],
)

export const listings = pgTable(
  'listings',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description').notNull(),
    price: integer('price').notNull(),
    status: varchar('status', { length: 20 }).$type<ListingStatus>().default('draft').notNull(),
    views: integer('views').default(0).notNull(),
    // Duration
    listingType: varchar('listing_type', { length: 20 }).$type<ListingType>().notNull(),
    availableFrom: timestamp('available_from').notNull(),
    availableTo: timestamp('available_to'),
    // Location
    country: varchar('country', { length: 2 }).notNull().default('PF'),
    region: varchar('region', { length: 50 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    latitude: text('latitude'),
    longitude: text('longitude'),
    // Room
    roomType: varchar('room_type', { length: 20 }).$type<RoomType>().notNull(),
    roommateCount: integer('roommate_count').notNull(),
    // Amenities — slugs from the `amenities` reference table. Filterable
    // via `WHERE amenities @> ARRAY[...]` (uses GIN index).
    amenities: text('amenities').array().default(sql`ARRAY[]::text[]`).notNull(),
    // Meta
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('listings_author_idx').on(table.authorId),
    index('listings_status_idx').on(table.status),
    index('listings_country_idx').on(table.country),
    index('listings_region_idx').on(table.region),
    index('listings_amenities_gin_idx').using('gin', table.amenities),
  ],
)

export const listingRelations = relations(listings, ({ one }) => ({
  author: one(user, {
    fields: [listings.authorId],
    references: [user.id],
  }),
}))

export const images = pgTable(
  'images',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: text('entity_id').notNull(),
    originalKey: text('original_key').notNull(),
    mediumKey: text('medium_key'),
    thumbnailKey: text('thumbnail_key'),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    originalWidth: integer('original_width'),
    originalHeight: integer('original_height'),
    sizeBytes: integer('size_bytes'),
    sortOrder: integer('sort_order').default(0).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('images_entity_idx').on(table.entityType, table.entityId),
    index('images_uploaded_by_idx').on(table.uploadedBy),
  ],
)

export const imageRelations = relations(images, ({ one }) => ({
  uploader: one(user, {
    fields: [images.uploadedBy],
    references: [user.id],
  }),
}))

export const favorites = pgTable(
  'favorites',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('favorites_user_idx').on(table.userId),
    index('favorites_listing_idx').on(table.listingId),
  ],
)

export const candidatures = pgTable(
  'candidatures',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    message: text('message'),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    isCouple: boolean('is_couple').default(false).notNull(),
    preferredMoveInDate: date('preferred_move_in_date'),
    rejectionMessage: text('rejection_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('candidatures_listing_idx').on(table.listingId),
    index('candidatures_user_idx').on(table.userId),
    index('candidatures_status_idx').on(table.status),
  ],
)

export const notificationPrefs = pgTable(
  'notification_prefs',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    emailEnabled: boolean('email_enabled').notNull(),
    pushEnabled: boolean('push_enabled').notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.eventType] }),
  ],
)
