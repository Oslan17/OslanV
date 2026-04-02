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
  const closeBtn   = document.getElementById('mobileMenuClose');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
  closeBtn && closeBtn.addEventListener('click', () => mobileMenu.classList.remove('open'));
  mobileMenu.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => mobileMenu.classList.remove('open'))
  );
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
  document.querySelectorAll('.js-email-copy').forEach(btn => {
    const email = btn.getAttribute('data-email') || btn.textContent.trim();
    btn.addEventListener('click', async e => {
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
  const observer = new IntersectionObserver(entries => {
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
  const lang = localStorage.getItem('lang') === 'es' ? 'es' : DEFAULT_LANG;
  applyTranslations(lang);

  const toggle = e => {
    if (e) e.preventDefault();
    const next = (localStorage.getItem('lang') || DEFAULT_LANG) === 'en' ? 'es' : 'en';
    localStorage.setItem('lang', next);
    applyTranslations(next);
  };

  document.getElementById('langToggleBtn')      && document.getElementById('langToggleBtn').addEventListener('click', toggle);
  document.getElementById('langToggleBtnMobile') && document.getElementById('langToggleBtnMobile').addEventListener('click', toggle);
}

function applyTranslations(lang) {
  document.documentElement.lang = lang;
  const dict = TRANSLATIONS[lang] || {};
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = getTranslation(dict, el.getAttribute('data-i18n'));
    if (typeof val === 'string') el.textContent = val;
  });
  const label = lang === 'en' ? 'ES' : 'EN';
  ['langToggleLabel', 'langToggleLabelMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = label;
  });
}

function getTranslation(dict, path) {
  return path.split('.').reduce((acc, k) => acc && acc[k] != null ? acc[k] : undefined, dict);
}

const TRANSLATIONS = {
  en: {
    nav: {
      services: 'Services',
      projects:  'Projects',
      about:     'About',
      contact:   'Contact',
      blog:      'Blog'
    },
    hero: {
      subtitle:    'I build cloud infrastructure, AI-powered automations, and platform integrations that ship fast and scale reliably.',
      ctaPrimary:  "Let's work together",
      ctaSecondary: 'View projects'
    },
    services: {
      cards: {
        dev:     { title: 'Cloud & DevOps',       desc: 'Cloud-native infrastructure, Kubernetes operations, CI/CD pipelines, and IaC with Terraform.' },
        int:     { title: 'Integrations',           desc: 'Connect your stack — CRMs, ERPs, payment gateways, and data pipelines with clean, maintainable integrations.' },
        ai:      { title: 'AI & Automation',        desc: 'LLM-powered assistants, RAG systems, n8n workflows, and AI agents that automate real business processes.' },
        content: { title: 'AI Content',             desc: 'AI-generated content for marketing and communications, aligned to your brand voice and goals.' },
        cloud:   { title: 'Cloud Architecture',     desc: 'Multi-cloud architecture, cost optimization, observability, and security across AWS, Azure, and GCP.' },
        obs:     { title: 'Observability',          desc: 'Prometheus, Grafana, alerting pipelines, and SLO tracking to keep your systems healthy and reliable.' }
      }
    },
    projects: {
      card1: { title: 'AI Automation',  desc: 'LLM-powered support assistant with context-aware responses, CRM integration, and multi-channel deployment.' },
      card2: { title: 'SaaS Platform',  desc: 'Full-stack SaaS with onboarding flows, subscription billing, usage analytics, and role-based access control.' }
    },
    contact: {
      subtitle: 'Ready to kick off a project? Drop me a line or book a call.',
      open:     'Open to projects',
      remote:   'Remote / Global'
    },
    logos: { title: 'I work with' }
  },

  es: {
    nav: {
      services: 'Servicios',
      projects:  'Proyectos',
      about:     'Acerca',
      contact:   'Contacto',
      blog:      'Blog'
    },
    hero: {
      subtitle:    'Construyo infraestructura cloud, automatizaciones con IA e integraciones que se entregan rápido y escalan de forma confiable.',
      ctaPrimary:  'Trabajemos juntos',
      ctaSecondary: 'Ver proyectos'
    },
    services: {
      cards: {
        dev:     { title: 'Cloud y DevOps',         desc: 'Infraestructura cloud-native, operaciones Kubernetes, pipelines CI/CD e IaC con Terraform.' },
        int:     { title: 'Integraciones',            desc: 'Conecta tu stack — CRMs, ERPs, pasarelas de pago y pipelines de datos con integraciones limpias y mantenibles.' },
        ai:      { title: 'IA y Automatización',      desc: 'Asistentes con LLMs, sistemas RAG, flujos n8n y agentes de IA que automatizan procesos reales de negocio.' },
        content: { title: 'Contenido con IA',         desc: 'Contenido generado con IA para marketing y comunicaciones, alineado a la voz y objetivos de tu marca.' },
        cloud:   { title: 'Arquitectura Cloud',       desc: 'Arquitectura multi-cloud, optimización de costos, observabilidad y seguridad en AWS, Azure y GCP.' },
        obs:     { title: 'Observabilidad',           desc: 'Prometheus, Grafana, pipelines de alertas y seguimiento de SLOs para mantener tus sistemas saludables y confiables.' }
      }
    },
    projects: {
      card1: { title: 'Automatización con IA', desc: 'Asistente con LLM para soporte al cliente, con respuestas contextuales, integración CRM y despliegue multicanal.' },
      card2: { title: 'Plataforma SaaS',        desc: 'SaaS full-stack con flujos de onboarding, facturación por suscripción, analítica de uso y control de acceso por roles.' }
    },
    contact: {
      subtitle: '¿Listo para arrancar un proyecto? Escríbeme o agenda una llamada.',
      open:     'Disponible para proyectos',
      remote:   'Remoto / Global'
    },
    logos: { title: 'Trabajo con' }
  }
};
