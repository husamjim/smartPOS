import { telemetry } from './utils/telemetry';
telemetry.reactStart = Date.now();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config'; // Import i18n config
import { AppProvider } from './context/AppContext.tsx';
import { CartProvider } from './context/CartContext.tsx';

import React from 'react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <CartProvider>
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-white">
            <div className="h-8 w-8 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin"></div>
          </div>
        }>
          <App />
        </React.Suspense>
      </CartProvider>
    </AppProvider>
  </StrictMode>,
);
