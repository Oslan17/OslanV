document.addEventListener('DOMContentLoaded', function () {
  const sidenavs = document.querySelectorAll('.sidenav');
  M.Sidenav.init(sidenavs, {});

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  setupThemeToggle();

  setupEmailCopy();

  setupScrollEffects();
});

function setupThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const toggleBtnMobile = document.getElementById('themeToggleBtnMobile');
  const stored = localStorage.getItem('prefers-dark') === 'true';

  if (stored) document.body.classList.add('dark');

  const sync = (isDark) => {
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('prefers-dark', String(isDark));
  };

  const invert = () => sync(!document.body.classList.contains('dark'));
  if (toggleBtn) toggleBtn.addEventListener('click', (e) => { e.preventDefault(); invert(); });
  if (toggleBtnMobile) toggleBtnMobile.addEventListener('click', (e) => { e.preventDefault(); invert(); });
}

function setupEmailCopy() {
  const btn = document.getElementById('emailCopyBtn');
  if (!btn) return;
  const email = btn.getAttribute('data-email');
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      const toast = `Email copied: ${email}`;
      M.toast({ html: toast });
    } catch (err) {
      // Fallback: open mailto
      window.location.href = `mailto:${email}`;
    }
  });
}

function setupScrollEffects() {
  const nav = document.querySelector('nav.transparent-nav');
  const onScroll = () => {
    if (!nav) return;
    const scrolled = window.scrollY > 8;
    nav.setAttribute('data-scrolled', String(scrolled));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}


