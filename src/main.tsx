import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { CompanyProvider } from './context/CompanyContext.tsx';
import { ConfirmProvider } from './context/ConfirmContext.tsx';
import './index.css';

// Register offline Service Worker for full PWA caching and offline load resilience
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Samira Traders offline engine successfully registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('Offline engine registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <CompanyProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </CompanyProvider>
    </LanguageProvider>
  </StrictMode>,
);

