import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { ProfileProvider, useProfiles } from './contexts/ProfileContext';
import { HomePage } from './pages/HomePage';
import { TrainingPage } from './pages/TrainingPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilesPage } from './pages/ProfilesPage';

/** Primeiro uso (nenhum perfil ativo) → seletor /profiles (F7). */
function RequireProfile({ children }: { children: ReactNode }) {
  const { activeProfile } = useProfiles();
  if (!activeProfile) return <Navigate to="/profiles" replace />;
  return children;
}

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <div className="flex h-full flex-col bg-bg">
          <Header />
          <Routes>
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route
              path="/"
              element={
                <RequireProfile>
                  <HomePage />
                </RequireProfile>
              }
            />
            <Route
              path="/training"
              element={
                <RequireProfile>
                  <ErrorBoundary>
                    <TrainingPage />
                  </ErrorBoundary>
                </RequireProfile>
              }
            />
            <Route
              path="/progress"
              element={
                <RequireProfile>
                  <ProgressPage />
                </RequireProfile>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </ProfileProvider>
  );
}
