import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles.css';

type BootStatus = 'BOOT OK' | 'BOOT FAIL';

type BootState = {
  status: BootStatus;
  summary: string;
};

const bootState: BootState = {
  status: 'BOOT OK',
  summary: '初始化中'
};

const updateBootBadge = () => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDev) return;

  const id = 'boot-debug-badge';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  el.textContent = `${bootState.status} · ${bootState.summary}`;
  el.className = `boot-debug-badge ${bootState.status === 'BOOT OK' ? 'is-ok' : 'is-fail'}`;
};

const setBootOk = (summary: string) => {
  bootState.status = 'BOOT OK';
  bootState.summary = summary;
  updateBootBadge();
};

const setBootFail = (summary: string) => {
  bootState.status = 'BOOT FAIL';
  bootState.summary = summary;
  updateBootBadge();
};

const getErrorSummary = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const renderBootFallback = (summary: string) => {
  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = `
    <div class="boot-fallback" role="alert">
      <h1>初始化失敗</h1>
      <p>請開啟 Console 查看錯誤。</p>
      <p>${summary}</p>
    </div>
  `;
};

const bootDiagnostics = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[boot] window.onerror', { message, source, lineno, colno, error });
    setBootFail(getErrorSummary(error ?? message));
    return false;
  };

  window.onunhandledrejection = (event) => {
    console.error('[boot] unhandledrejection', event.reason);
    setBootFail(getErrorSummary(event.reason));
  };

  updateBootBadge();
};

class BootErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean; message: string }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: getErrorSummary(error)
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('[boot] react render error', error, errorInfo);
    setBootFail(getErrorSummary(error));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="boot-fallback" role="alert">
          <h1>初始化失敗</h1>
          <p>請開啟 Console 查看錯誤。</p>
          <p>{this.state.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

bootDiagnostics();

try {
  const root = document.getElementById('root');
  if (!root) throw new Error('#root not found');

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BootErrorBoundary>
        <App />
      </BootErrorBoundary>
    </React.StrictMode>
  );
  setBootOk('React 掛載完成');
} catch (error) {
  const summary = getErrorSummary(error);
  console.error('[boot] initialization failed', error);
  setBootFail(summary);
  renderBootFallback(summary);
}
