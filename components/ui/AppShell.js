/**
 * AppShell — Hero permanent + Hero Cycle + Carte Coach
 * Utilise useBreakpoint() au lieu de window.innerWidth dupliqué
 */
import AppNav from '../AppNav'
import { useBreakpoint } from '../../hooks/useBreakpoint'

export default function AppShell({
  title, subtitle, actions, children,
  userName,           // prénom du coaché → Hero permanent "Bonjour {userName}"
  cycleName, cycleWeek, cycleTotal, cycleObjective,  // Hero Cycle
  coachName = 'Ben', coachAvailable = true, coachLastMessage,  // Carte coach
}) {
  const isMobile = useBreakpoint(980)
  const progress = cycleWeek && cycleTotal ? Math.round((cycleWeek / cycleTotal) * 100) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #FAF9F7)', fontFamily: "'DM Sans',sans-serif", overflowX: 'hidden' }}>
      <AppNav />
      <div style={{ marginLeft: isMobile ? 0 : 260, transition: 'margin-left 0.25s ease' }}>
        <div style={{ maxWidth: 1540, margin: '0 auto', padding: isMobile ? '70px 12px 90px' : '32px 32px 40px' }}>

          {/* ══ HERO PERMANENT ═══════════════════════════════════════════
              Toujours visible, même sans cycle chargé.
              C'est le problème #2 du 2e audit : "AppShell trop administratif" */}
          {userName && (
            <div style={{
              background: 'var(--navy, #0D1B2A)',
              borderRadius: 'var(--r-lg, 28px)',
              padding: isMobile ? '22px 20px' : '30px 36px',
              marginBottom: 16,
              position: 'relative', overflow: 'hidden',
              boxShadow: 'var(--shadow-hero, 0 24px 60px rgba(13,27,42,0.22))',
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(184,134,11,0.14) 0%, transparent 55%)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 30, color: 'white', letterSpacing: '1.5px', marginBottom: 4 }}>
                    Bonjour {userName} 👋
                  </div>
                  {cycleName ? (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                      Cycle <span style={{ color: 'var(--gold-light, #D4AF37)', fontWeight: 700 }}>{cycleName}</span> · Semaine {cycleWeek}/{cycleTotal}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Voici ton suivi aujourd'hui</div>
                  )}

                  {/* Barre de progression Hero Cycle — agrandie (problème #4) */}
                  {progress !== null && (
                    <div style={{ marginTop: 16, maxWidth: 320 }}>
                      <div style={{ height: 7, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--gold, #B8860B), var(--gold-light, #D4AF37))', width: `${progress}%`, borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Progression du cycle</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold-light, #D4AF37)' }}>{progress}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Objectif */}
                {cycleObjective && (
                  <div style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--r-sm, 12px)', padding: '14px 18px', minWidth: 140, backdropFilter: 'blur(10px)',
                  }}>
                    <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Objectif</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>🎯 {cycleObjective}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ CARTE COACH ══════════════════════════════════════════════
              Problème #1 et "manque premium" des 2 audits : le coach est invisible */}
          {coachName && (
            <div style={{
              background: 'var(--card, #FFFFFF)',
              border: '1.5px solid var(--gold-light, #D4AF37)',
              borderRadius: 'var(--r-md, 20px)',
              padding: isMobile ? '14px 16px' : '16px 22px',
              marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 14, flexWrap: 'wrap',
              boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(13,27,42,0.05))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold, #B8860B), var(--gold-light, #D4AF37))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Playfair Display',serif", fontSize: 15, color: 'white', fontWeight: 700,
                  }}>{coachName[0]}</div>
                  {coachAvailable && (
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#3FBE6E', border: '2px solid white' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy, #0D1B2A)' }}>Coach {coachName}</div>
                  {coachLastMessage ? (
                    <div style={{ fontSize: 11.5, color: 'var(--text-faint, #A09880)', maxWidth: 280, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      "{coachLastMessage}"
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: coachAvailable ? '#3F7D58' : 'var(--text-faint, #A09880)', fontWeight: 600 }}>
                      {coachAvailable ? '● Disponible' : 'Hors ligne'}
                    </div>
                  )}
                </div>
              </div>
              <a href="/messages" style={{
                fontSize: 12, fontWeight: 700, color: 'var(--gold, #B8860B)',
                textDecoration: 'none', whiteSpace: 'nowrap',
                padding: '6px 14px', border: '1px solid var(--gold-light, #D4AF37)', borderRadius: 'var(--r-sm, 12px)',
              }}>Message →</a>
            </div>
          )}

          {/* ── Header page classique ── */}
          {(title || subtitle || actions) && (
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              justifyContent: 'space-between', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 12 : 24,
            }}>
              <div>
                {title && <h1 style={{ margin: 0, color: 'var(--navy, #0D1B2A)', fontSize: isMobile ? 22 : 38, lineHeight: 1.05, fontWeight: 900, letterSpacing: '-0.02em' }}>{title}</h1>}
                {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--text-soft, #6B6456)', fontSize: isMobile ? 12 : 15, lineHeight: 1.5, maxWidth: 640 }}>{subtitle}</p>}
              </div>
              {actions && <div style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>{actions}</div>}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
