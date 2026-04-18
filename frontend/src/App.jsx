import React from 'react';
import { AnimatePresence } from 'framer-motion';
import useAppStore from './store/useAppStore';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LoadingOverlay from './components/LoadingOverlay';

export default function App() {
  const step = useAppStore(s => s.step);
  const isDashboard = step === 'dashboard';

  return (
    <>
      <AnimatePresence>
        <LoadingOverlay key="loading" />
      </AnimatePresence>
      {isDashboard ? <DashboardPage /> : <HomePage />}
    </>
  );
}
