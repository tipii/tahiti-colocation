import { pub } from './base'
import * as listing from './listing'
import * as image from './image'
import * as favorite from './favorite'
import * as chat from './chat'
import * as userProc from './user'

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
    ids: favorite.ids,
    toggle: favorite.toggle,
  },
  chat: {
    getOrCreate: chat.getOrCreate,
    list: chat.list,
    messages: chat.getMessages,
    send: chat.send,
    unreadCount: chat.unreadCount,
  },
  user: {
    me: userProc.me,
    update: userProc.update,
    updateAvatar: userProc.updateAvatar,
    removeAvatar: userProc.removeAvatar,
  },
})
