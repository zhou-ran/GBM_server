import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { useAppPreload } from './hooks/useAppPreload';
import { MainLayout } from './layouts/MainLayout';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));

function App() {
  useAppPreload();

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingOverlay />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="explorer" element={<ExplorerPage />}>
              <Route path="cell/:cellId" element={null} />
            </Route>
            <Route path="about" element={<AboutPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <LoadingOverlay />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
