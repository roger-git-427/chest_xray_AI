import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ClinicProvider } from './context/ClinicContext';
import { StudyDataProvider } from './context/StudyDataContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ClinicProvider>
          <StudyDataProvider>
            <App />
          </StudyDataProvider>
        </ClinicProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
