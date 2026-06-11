import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { HomePage } from './pages/HomePage';
import { TrainingPage } from './pages/TrainingPage';

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
        </Routes>
      </div>
    </BrowserRouter>
  );
}
