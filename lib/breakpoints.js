// lib/breakpoints.js
// Point unique de vérité pour les seuils de largeur d'écran.
// Avant ce fichier, chaque page avait son propre seuil "mobile"
// (768px dans AppShell.js, 980px dans training.js/coach.js/dashboard.js),
// ce qui créait des transitions incohérentes selon la page visitée.

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 980,
  desktop: 1200,
}

// Helper pratique pour les useEffect de détection de largeur d'écran :
//   const [isMobile, setIsMobile] = useState(false)
//   useEffect(() => watchBreakpoint('tablet', setIsMobile), [])
export function watchBreakpoint(key, setState) {
  const check = () => setState(window.innerWidth < BREAKPOINTS[key])
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}
