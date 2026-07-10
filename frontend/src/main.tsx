import { telemetry } from './utils/telemetry';
telemetry.reactStart = Date.now();

import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { AppProvider } from './context/AppContext.tsx';
import { CartProvider } from './context/CartContext.tsx';

// ============================================================
// GLOBAL ERROR REPORTER — sends JS errors to Electron main log
// ============================================================
function reportToElectron(message: string, stack: string, source: string) {
  try {
    if ((window as any).electronAPI?.reportError) {
      (window as any).electronAPI.reportError(message, stack, source);
    }
  } catch {
    // Ignore if not in Electron
  }
}

window.onerror = (msg, src, line, col, error) => {
  const message = String(msg);
  const stack = error?.stack || `${src}:${line}:${col}`;
  console.error('[GLOBAL ERROR]', message, stack);
  reportToElectron(message, stack, 'window.onerror');
  return false;
};

window.addEventListener('unhandledrejection', (event) => {
  const message = `Unhandled Promise rejection: ${event.reason}`;
  const stack = event.reason?.stack || String(event.reason);
  console.error('[UNHANDLED REJECTION]', message);
  reportToElectron(message, stack, 'unhandledrejection');
});

// ============================================================
// ERROR BOUNDARY — prevents blank screen on React render crash
// ============================================================
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[REACT CRASH]', error, errorInfo);
    reportToElectron(
      error.message,
      error.stack || errorInfo.componentStack || '',
      'ErrorBoundary.componentDidCatch'
    );
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          direction: 'rtl',
          padding: '20px',
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #ef4444',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '640px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ color: '#ef4444', fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>
              خطأ في تحميل التطبيق
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '16px', lineHeight: '1.6' }}>
              حدث خطأ غير متوقع أثناء تشغيل الواجهة. تم تسجيل الخطأ في ملف السجل.
            </p>
            <div style={{
              background: '#0f172a',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: '200px',
            }}>
              <p style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                {error?.name}: {error?.message}
              </p>
              <pre style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {error?.stack || 'No stack trace available'}
              </pre>
              {errorInfo?.componentStack && (
                <pre style={{ color: '#475569', fontSize: '10px', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: '#3b82f6', color: 'white', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 'bold',
                }}
              >
                🔄 إعادة المحاولة
              </button>
              <button
                onClick={() => {
                  if ((window as any).electronAPI?.openLogFile) {
                    (window as any).electronAPI.openLogFile();
                  }
                }}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: '1px solid #334155',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                📋 فتح ملف السجل
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// SUSPENSE FALLBACK — shown during lazy page loading
// ============================================================
const SuspenseFallback = (
  <div style={{
    minHeight: '100vh',
    background: '#090d16',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%',
      border: '3px solid transparent',
      borderTopColor: '#3b82f6',
      borderBottomColor: '#3b82f6',
      animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

console.log('[RENDERER] React entry point loaded — mounting app');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <CartProvider>
          <React.Suspense fallback={SuspenseFallback}>
            <App />
          </React.Suspense>
        </CartProvider>
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);

