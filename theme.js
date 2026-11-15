// Home Screen app on iPhone: marked early so the header can clear the status-bar blur (style.css).
if (navigator.standalone) document.documentElement.classList.add('standalone');

// Runs in <head>, before the page draws, so a chosen light/dark theme never flashes the other one.
// (A separate file because the Content-Security-Policy blocks inline scripts.)
try {
  const t = localStorage.getItem('healthlog.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch { /* storage unavailable: follow the system */ }
