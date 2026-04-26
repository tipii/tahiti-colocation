import { pub } from './base'
import * as listing from './listing'
import * as image from './image'
import * as favorite from './favorite'
import * as candidature from './candidature'
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
  candidature: {
    apply: candidature.apply,
    withdraw: candidature.withdraw,
    accept: candidature.accept,
    reject: candidature.reject,
    finalize: candidature.finalize,
    forListing: candidature.forListing,
    mine: candidature.mine,
    count: candidature.count,
    contact: candidature.contact,
  },
  user: {
    me: userProc.me,
    update: userProc.update,
    updateAvatar: userProc.updateAvatar,
    removeAvatar: userProc.removeAvatar,
    setMode: userProc.setMode,
    registerPushToken: userProc.registerPushToken,
    getNotificationPrefs: userProc.getNotificationPrefs,
    updateNotificationPrefs: userProc.updateNotificationPrefs,
    exportData: userProc.exportData,
    deleteAccount: userProc.deleteAccount,
  },
})
