document.addEventListener('DOMContentLoaded', function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  setupHamburgerMenu();
  setupEmailCopy();
  setupScrollReveal();
  setupI18n();
});

// ── HAMBURGER MENU ──
function setupHamburgerMenu() {
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const closeBtn = document.getElementById('mobileMenuClose');

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
  closeBtn && closeBtn.addEventListener('click', () => mobileMenu.classList.remove('open'));

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

// ── TOAST ──
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── EMAIL COPY ──
function setupEmailCopy() {
  document.querySelectorAll('.js-email-copy').forEach((btn) => {
    const email = btn.getAttribute('data-email') || btn.textContent.trim();
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(email);
        showToast('Email copied: ' + email);
      } catch {
        window.location.href = 'mailto:' + email;
      }
    });
  });
}

// ── SCROLL REVEAL ──
function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── INTERNATIONALIZATION ──
function setupI18n() {
  const DEFAULT_LANG = 'en';
  const stored = localStorage.getItem('lang');
  const lang = stored === 'es' ? 'es' : DEFAULT_LANG;
  applyTranslations(lang);

  const btn = document.getElementById('langToggleBtn');
  const btnMobile = document.getElementById('langToggleBtnMobile');

  const toggle = (e) => {
    if (e) e.preventDefault();
    const current = localStorage.getItem('lang') || DEFAULT_LANG;
    const next = current === 'en' ? 'es' : 'en';
    localStorage.setItem('lang', next);
    applyTranslations(next);
  };

  if (btn) btn.addEventListener('click', toggle);
  if (btnMobile) btnMobile.addEventListener('click', toggle);
}

function applyTranslations(lang) {
  document.documentElement.lang = lang;
  const dict = TRANSLATIONS[lang] || {};

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = getTranslation(dict, key);
    if (typeof value === 'string') el.textContent = value;
  });

  const label = lang === 'en' ? 'ES' : 'EN';
  const desktopLabel = document.getElementById('langToggleLabel');
  const mobileLabel = document.getElementById('langToggleLabelMobile');
  if (desktopLabel) desktopLabel.textContent = label;
  if (mobileLabel) mobileLabel.textContent = label;
}

function getTranslation(dict, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), dict);
}

const TRANSLATIONS = {
  en: {
    nav: { services: 'Services', projects: 'Projects', about: 'About', contact: 'Contact' },
    hero: {
      subtitle: 'I design, build and integrate modern solutions that automate workflows, improve customer experience, and scale your digital operations.',
      ctaPrimary: "Let's work together",
      ctaSecondary: 'View projects'
    },
    services: {
      cards: {
        dev:     { title: 'Cloud & DevOps',    desc: 'Cloud-native backends, CI/CD, IaC, containers, and reliable operations.' },
        int:     { title: 'Integrations',       desc: 'Connect your systems and data: CRMs, ERPs, payments, analytics, and seamless automations.' },
        ai:      { title: 'AI & Automation',    desc: 'Intelligent assistants, RAG, agents, workflows, and copilots to accelerate your processes.' },
        content: { title: 'AI Content',         desc: 'Content generation for marketing and communication aligned with your brand and goals.' },
        cloud:   { title: 'Cloud',              desc: 'AWS, Azure, and Google Cloud: architecture, deployments, observability, and cost optimization.' }
      }
    },
    projects: {
      card1: { title: 'AI Automation',  desc: 'Intelligent assistant for customer support, integrations, and context-aware responses.' },
      card2: { title: 'SaaS Platform',  desc: 'Full-stack development focused on onboarding, billing, and product analytics.' }
    },
    contact: {
      subtitle: 'Ready to start? Book a call or send me a message.',
      open:     'Open to projects',
      remote:   'Remote / Global'
    },
    logos: { title: 'I work with' }
  },
  es: {
    nav: { services: 'Servicios', projects: 'Proyectos', about: 'Acerca', contact: 'Contacto' },
    hero: {
      subtitle: 'Diseño, construyo e integro soluciones modernas que automatizan flujos, mejoran la experiencia del cliente y escalan tus operaciones digitales.',
      ctaPrimary: 'Trabajemos juntos',
      ctaSecondary: 'Ver proyectos'
    },
    services: {
      cards: {
        dev:     { title: 'Cloud y DevOps',       desc: 'Backends cloud-native, CI/CD, IaC, contenedores y operaciones confiables.' },
        int:     { title: 'Integraciones',          desc: 'Conecta tus sistemas y datos: CRMs, ERPs, pagos, analítica y automatizaciones.' },
        ai:      { title: 'IA y Automatización',    desc: 'Asistentes inteligentes, RAG, agentes, flujos y copilotos para acelerar procesos.' },
        content: { title: 'Contenido con IA',       desc: 'Generación de contenido para marketing y comunicación alineado a tu marca y objetivos.' },
        cloud:   { title: 'Nube',                   desc: 'AWS, Azure y Google Cloud: arquitectura, despliegues, observabilidad y optimización de costos.' }
      }
    },
    projects: {
      card1: { title: 'Automatización con IA', desc: 'Asistente inteligente para soporte, integraciones y respuestas con contexto.' },
      card2: { title: 'Plataforma SaaS',        desc: 'Desarrollo full-stack con foco en onboarding, facturación y analítica de producto.' }
    },
    contact: {
      subtitle: '¿Listo para empezar? Agenda una llamada o envíame un mensaje.',
      open:     'Abierto a proyectos',
      remote:   'Remoto / Global'
    },
    logos: { title: 'Trabajo con' }
  }
};
