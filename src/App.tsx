import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { ProfileProvider, useProfiles } from './contexts/ProfileContext';
import { HomePage } from './pages/HomePage';
import { TrainingPage } from './pages/TrainingPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilesPage } from './pages/ProfilesPage';

/** First use (no active profile) lands on the /profiles selector (F7). */
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
          {/*
            The boundary wraps every route, not just training. A render error
            on the home or progress screen used to paint a blank page with no
            way back, which is worse than the same error during a session:
            those two screens are where a user lands, so there is nothing left
            to navigate away to.
          */}
          <ErrorBoundary>
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
                    {/*
                      Training keeps its own boundary so a camera or MediaPipe
                      failure resets the session without unmounting the rest of
                      the app.
                    */}
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
          </ErrorBoundary>
        </div>
      </BrowserRouter>
    </ProfileProvider>
  );
}
