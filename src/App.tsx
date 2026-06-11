import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { HomePage } from './pages/HomePage';
import { TrainingPage } from './pages/TrainingPage';
import { ProgressPage } from './pages/ProgressPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-full flex-col bg-bg">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/training"
            element={
              <ErrorBoundary>
                <TrainingPage />
              </ErrorBoundary>
            }
          />
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
