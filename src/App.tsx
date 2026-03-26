import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { HomePage } from './pages/HomePage';
import { TrainingPage } from './pages/TrainingPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-full flex-col bg-boxing-dark">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/training" element={<TrainingPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
