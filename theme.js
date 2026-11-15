// Runs in <head>, before the page draws, so a chosen light/dark theme never flashes the other one.
// (A separate file because the Content-Security-Policy blocks inline scripts.)
try {
  const t = localStorage.getItem('healthlog.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch { /* storage unavailable: follow the system */ }
