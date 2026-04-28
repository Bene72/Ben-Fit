'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation' // CHANGÉ
import { supabase } from '../lib/supabase'
import AppShell from '../components/ui/AppShell'
import { useToast } from '../lib/useToast'

// ... dans le composant :
const { show, ToastComponent } = useToast()
const router = useRouter()
// ... remplacer les router.push('/') par router.replace('/')
// ... remplacer les setSuccess/setError visuels par show() si tu veux, ou garder ton UI existant. Ton code nutrition.js est déjà propre, juste le router et dynamic à ajuster.