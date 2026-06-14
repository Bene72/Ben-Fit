/**
 * Icônes SVG Ben&Fit — remplace les emojis OS-dépendants dans toute l'app
 * Taille, couleur et strokeWidth contrôlables via props
 *
 * Usage :
 *   import { Icon } from '../components/ui/Icon'
 *   <Icon name="training" size={20} color="white" />
 *
 * Liste : dashboard, training, nutrition, bilan, community,
 *         coach, plus, edit, trash, check, close, back, forward,
 *         settings, message, archive, duplicate, image, ai,
 *         calendar, weight, home, logout, alert, info
 */

const PATHS = {
  dashboard: <>
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </>,
  training: <>
    <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/>
  </>,
  nutrition: <>
    <path d="M12 2a9 9 0 0 1 9 9c0 3.5-2 7-5 8.5V21H8v-1.5C5 18 3 14.5 3 11a9 9 0 0 1 9-9z"/>
    <path d="M12 7v5l3 3"/>
  </>,
  bilan: <>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="M9 12h6M9 16h4"/>
  </>,
  community: <>
    <circle cx="9" cy="7" r="3"/>
    <circle cx="17" cy="9" r="2.5"/>
    <path d="M2 21v-2a5 5 0 0 1 10 0v2M17 21v-1.5a4.5 4.5 0 0 0-2.5-4"/>
  </>,
  coach: <>
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    <path d="M16 11l2 2 4-4"/>
  </>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  edit: <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </>,
  trash: <>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
  </>,
  check: <><path d="M20 6L9 17l-5-5"/></>,
  close: <><path d="M18 6L6 18M6 6l12 12"/></>,
  back: <><path d="M19 12H5M12 5l-7 7 7 7"/></>,
  forward: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
  settings: <>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </>,
  message: <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </>,
  archive: <>
    <rect x="2" y="4" width="20" height="5" rx="1"/>
    <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4"/>
  </>,
  duplicate: <>
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </>,
  image: <>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </>,
  ai: <>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </>,
  calendar: <>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
  </>,
  weight: <>
    <path d="M6 7h12l1 13H5L6 7z"/>
    <path d="M9 7a3 3 0 0 1 6 0"/>
  </>,
  home: <>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </>,
  logout: <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <path d="M16 17l5-5-5-5M21 12H9"/>
  </>,
  alert: <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </>,
  info: <>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </>,
  chevron_down: <><path d="M6 9l6 6 6-6"/></>,
  chevron_up:   <><path d="M18 15l-6-6-6 6"/></>,
  move_up:   <><path d="M5 15l7-7 7 7"/></>,
  move_down: <><path d="M19 9l-7 7-7-7"/></>,
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.8, className = '', style = {} }) {
  const paths = PATHS[name]
  if (!paths) {
    console.warn(`Icon "${name}" not found`)
    return null
  }
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}

// Pour usage rapide dans les listes de nav
export const NAV_ICONS = {
  dashboard:  { name: 'dashboard', label: 'Dashboard' },
  training:   { name: 'training',  label: 'Training' },
  nutrition:  { name: 'nutrition', label: 'Nutrition' },
  bilan:      { name: 'bilan',     label: 'Bilan' },
  community:  { name: 'community', label: 'Communauté' },
}
