import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setProfile(profile);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const isCoach = profile?.role === 'coach';
  const isClient = profile?.role === 'client';

  if (loading) return <div>Chargement...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ 
        width: 260, 
        background: '#0D1B4E', 
        color: 'white', 
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ color: 'white', margin: 0 }}>BEN&FIT COACH</h2>
          <div style={{ fontSize: 12, color: '#6B8ED6', marginTop: 4 }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: '#6B8ED6' }}>
            {isCoach ? '👨‍🏫 Coach' : '🏃 Athlète'}
          </div>
        </div>

        {/* Navigation commune à tous */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          <NavItem href="/apercu" icon="📊">Aperçu</NavItem>
          <NavItem href="/programme" icon="💪">Programme</NavItem>
          <NavItem href="/nutrition" icon="🍽️">Nutrition</NavItem>
          <NavItem href="/bilan" icon="📈">Bilan</NavItem>
          <NavItem href="/messages" icon="💬">Messages</NavItem>
          <NavItem href="/gestion" icon="⚙️">Gestion</NavItem>
        </nav>

        {/* Navigation réservée au coach */}
        {isCoach && (
          <div style={{ 
            borderTop: '1px solid rgba(255,255,255,0.1)', 
            paddingTop: 12,
            paddingBottom: 12
          }}>
            <div style={{ padding: '0 20px 8px', fontSize: 10, color: '#6B8ED6', textTransform: 'uppercase', letterSpacing: '1px' }}>
              👨‍🏫 GESTION COACH
            </div>
            <NavItem href="/dashboard" icon="📊">Dashboard</NavItem>
            <NavItem href="/eleves" icon="👥">Élèves</NavItem>
            <NavItem href="/saison" icon="📅">Saison / Cycles</NavItem>
            <NavItem href="/programmes/template" icon="📋">Bibliothèque programmes</NavItem>
          </div>
        )}

        {/* Déconnexion */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 20px' }}>
          <button 
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B8ED6',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              width: '100%',
              textAlign: 'left'
            }}
          >
            🚪 Se déconnecter
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 260, flex: 1, padding: '24px', background: '#F8FAFF', minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  );
}

// Composant NavItem
function NavItem({ href, icon, children }) {
  const router = useRouter();
  const isActive = router.pathname === href || router.pathname.startsWith(href + '/');

  return (
    <Link href={href}>
      <div style={{
        padding: '10px 20px',
        margin: '2px 8px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        color: isActive ? 'white' : '#6B8ED6',
        background: isActive ? 'rgba(44,100,229,0.3)' : 'transparent',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <span>{icon}</span>
        {children}
      </div>
    </Link>
  );
}
