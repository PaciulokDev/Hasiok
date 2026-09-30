import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { FeedPage } from './pages/FeedPage';
import { MatchesPage } from './pages/MatchesPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="center muted">Ładowanie memów…</div>;
  if (!user) return <AuthPage />;

  return (
    <div className="layout">
      <header className="topbar">
        <span className="logo">😂 Hasiok</span>
        <nav className="nav">
          <NavLink to="/" end>🔥 Odkrywaj</NavLink>
          <NavLink to="/feed">🎯 Oceniaj memy</NavLink>
          <NavLink to="/matches">💬 Pary</NavLink>
          <NavLink to="/profile">🙂 Profil</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:id" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
