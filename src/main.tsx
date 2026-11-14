import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function showBootstrapError(err: unknown) {
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack || ''}` : String(err);
  let errDiv = document.getElementById('fatal-error-overlay');
  if (!errDiv) {
    errDiv = document.createElement('div');
    errDiv.id = 'fatal-error-overlay';
    errDiv.style.cssText =
      'position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,0.97);color:#fecdd3;padding:24px;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:auto;';
    document.body.appendChild(errDiv);
  }
  errDiv.innerHTML = `
    <div style="max-width:720px;border:2px solid #f43f5e;background:#090d16;padding:24px;border-radius:16px;box-shadow:0 0 40px rgba(244,63,94,0.4);">
      <h2 style="color:#fb7185;font-size:20px;margin:0 0 12px 0;font-weight:800;">⚠️ Error Fatal Detectado en Producción</h2>
      <pre style="white-space:pre-wrap;word-break:break-word;font-size:13px;color:#ffe4e6;background:#1e293b;padding:14px;border-radius:8px;text-align:left;margin:0;">${msg}</pre>
    </div>
  `;
}

function bootstrapApplication() {
  try {
    let rootEl = document.getElementById('root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'root';
      document.body.appendChild(rootEl);
    }
    createRoot(rootEl).render(<App />);
  } catch (err) {
    showBootstrapError(err);
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrapApplication();
} else {
  window.addEventListener('DOMContentLoaded', bootstrapApplication, { once: true });
}
