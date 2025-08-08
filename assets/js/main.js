document.addEventListener('DOMContentLoaded', function () {
  const sidenavs = document.querySelectorAll('.sidenav');
  M.Sidenav.init(sidenavs, {});

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  setupThemeToggle();
});

function setupThemeToggle() {
  const toggle = document.getElementById('darkModeToggle');
  const toggleMobile = document.getElementById('darkModeToggleMobile');
  const stored = localStorage.getItem('prefers-dark') === 'true';

  if (stored) document.body.classList.add('dark');
  if (toggle) toggle.checked = stored;
  if (toggleMobile) toggleMobile.checked = stored;

  const sync = (isDark) => {
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('prefers-dark', String(isDark));
    if (toggle && toggle.checked !== isDark) toggle.checked = isDark;
    if (toggleMobile && toggleMobile.checked !== isDark) toggleMobile.checked = isDark;
  };

  if (toggle) toggle.addEventListener('change', (e) => sync(e.target.checked));
  if (toggleMobile) toggleMobile.addEventListener('change', (e) => sync(e.target.checked));
}


