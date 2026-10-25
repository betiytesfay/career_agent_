import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import AppFlow from './pages/AppFlow.jsx';
import ReopenPlan from './pages/ReopenPlan.jsx';
import { useDemoState } from './hooks/useDemoState.js';
import { ThemeProvider } from './context/ThemeContext.jsx';

export default function App() {
  const demoState = useDemoState();

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppFlow state={demoState} />} />
          <Route
            path="/plans"
            element={
              <ReopenPlan
                savedPlans={demoState.savedPlans}
                toggleTaskDone={demoState.toggleSavedPlanTaskDone}
                onDeletePlan={demoState.deleteSavedPlan}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
