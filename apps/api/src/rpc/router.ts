import { pub } from './base'
import * as listing from './listing'
import * as image from './image'
import * as favorite from './favorite'

export const router = pub.router({
  listing: {
    list: listing.list,
    get: listing.get,
    mine: listing.mine,
    create: listing.create,
    update: listing.update,
    delete: listing.remove,
    publish: listing.publish,
    archive: listing.archive,
  },
  image: {
    list: image.list,
    delete: image.remove,
    reorder: image.reorder,
  },
  favorite: {
    list: favorite.list,
    toggle: favorite.toggle,
    check: favorite.check,
  },
})
