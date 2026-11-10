/**
 * lib/push.js — notifications push côté navigateur (abonnement du téléphone).
 *
 * Fonctionne sur Android (Chrome) et ordinateur. Sur iPhone : uniquement si
 * l'app a été ajoutée à l'écran d'accueil (iOS 16.4+), d'où isIOSBrowser().
 */
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function pushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY)
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/** iPhone/iPad dans Safari (pas encore installée sur l'écran d'accueil). */
export function isIOSBrowser() {
  if (typeof navigator === 'undefined') return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return ios && !isStandalone()
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function permissionState() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    console.warn('[push] service worker', e)
    return null
  }
}

/** Demande l'autorisation et enregistre l'abonnement du téléphone. */
export async function enablePush(userId) {
  if (!pushSupported()) throw new Error('Notifications non prises en charge sur cet appareil.')
  if (!pushConfigured()) throw new Error('Notifications pas encore configurées.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications refusées dans les réglages.')
  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker())
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 250),
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return true
}

/** Le téléphone est-il déjà abonné ? */
export async function hasPushSubscription() {
  if (!pushSupported() || permissionState() !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return Boolean(await reg?.pushManager.getSubscription())
}
