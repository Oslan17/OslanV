document.addEventListener('DOMContentLoaded', function () {
  const sidenavs = document.querySelectorAll('.sidenav');
  M.Sidenav.init(sidenavs, {});

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Enforce dark theme permanently
  document.body.classList.add('dark');

  setupEmailCopy();
  setupScrollEffects();
  setupI18n();
});

// Internationalization
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
    if (typeof value === 'string') {
      el.textContent = value;
    }
  });

  // Update toggle labels to show the target language code
  const label = lang === 'en' ? 'ES' : 'EN';
  const desktopLabel = document.getElementById('langToggleLabel');
  const mobileLabel = document.getElementById('langToggleLabelMobile');
  if (desktopLabel) desktopLabel.textContent = label;
  if (mobileLabel) mobileLabel.textContent = label;
}

function getTranslation(dict, path) {
  // Support nested keys like "services.cards.dev.title"
  return path.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), dict);
}

const TRANSLATIONS = {
  en: {
    nav: { services: 'Services', projects: 'Projects', about: 'About', contact: 'Contact' },
    hero: {
      badge1: 'Software & AI',
      badge2: 'Cloud • Automation',
      title: 'Transform your business with software and AI',
      subtitle: 'I design, build and integrate modern solutions that automate workflows, improve customer experience, and scale your digital operations.',
      ctaPrimary: "Let’s work together",
      ctaSecondary: 'View projects',
      card1: { title: 'AI Assistants', desc: 'RAG • Agents • Workflows' },
      card2: { title: 'Integrations', desc: 'CRMs • ERPs • Payments' },
      card3: { title: 'Cloud', desc: 'AWS • Azure • GCP' }
    },
    services: {
      title: 'Services',
      subtitle: 'Custom application development, platform integrations, AI implementations for automation and intelligent assistants, and AI‑generated content. I also provide cloud support, digital campaigns, and end‑to‑end technology consulting.',
      cards: {
        dev: { title: 'Development', desc: 'Custom web and mobile apps focused on performance, scalability, and user experience.' },
        int: { title: 'Integrations', desc: 'Connect your systems and data: CRMs, ERPs, payments, analytics, and seamless automations.' },
        ai: { title: 'AI & Automation', desc: 'Intelligent assistants, RAG, agents, workflows, and copilots to accelerate your processes.' },
        content: { title: 'AI Content', desc: 'Content generation for marketing and communication aligned with your brand and goals.' },
        cloud: { title: 'Cloud', desc: 'AWS, Azure, and Google Cloud: architecture, deployments, observability, and cost optimization.' }
      }
    },
    projects: {
      title: 'Projects',
      card1: { title: 'AI Automation', desc: 'Intelligent assistant for customer support, integrations, and context‑aware responses.' },
      card2: { title: 'SaaS Platform', desc: 'Full‑stack development focused on onboarding, billing, and product analytics.' },
      repo: 'Repository'
    },
    about: {
      title: 'About me',
      description: 'I help organizations with their digital transformation through scalable, efficient, and innovative solutions. I design and implement strategies that connect business and technology to deliver fast, measurable value.',
      list1: 'End‑to‑end project management',
      list2: 'Applied AI for processes and products',
      list3: 'Integrations and data‑driven decisions',
      list4: 'Cloud, security, and performance'
    },
    contact: {
      title: 'Contact',
      subtitle: 'Ready to start? Book a call or send me a message.',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      x: 'X',
      open: 'Open to projects',
      remote: 'Remote / Global'
    },
    footer: {
      tagline: 'Software and AI solutions to accelerate your digital transformation.',
      rights: 'All rights reserved'
    },
    logos: { title: 'I work with' }
  },
  es: {
    nav: { services: 'Servicios', projects: 'Proyectos', about: 'Acerca', contact: 'Contacto' },
    hero: {
      badge1: 'Software y IA',
      badge2: 'Nube • Automatización',
      title: 'Transforma tu negocio con software e IA',
      subtitle: 'Diseño, construyo e integro soluciones modernas que automatizan flujos, mejoran la experiencia del cliente y escalan tus operaciones digitales.',
      ctaPrimary: 'Trabajemos juntos',
      ctaSecondary: 'Ver proyectos',
      card1: { title: 'Asistentes de IA', desc: 'RAG • Agentes • Flujos' },
      card2: { title: 'Integraciones', desc: 'CRMs • ERPs • Pagos' },
      card3: { title: 'Nube', desc: 'AWS • Azure • GCP' }
    },
    services: {
      title: 'Servicios',
      subtitle: 'Desarrollo a medida, integraciones de plataformas, implementaciones de IA para automatización y asistentes inteligentes, y contenido generado con IA. También brindo soporte cloud, campañas digitales y consultoría end‑to‑end.',
      cards: {
        dev: { title: 'Desarrollo', desc: 'Aplicaciones web y móviles enfocadas en rendimiento, escalabilidad y UX.' },
        int: { title: 'Integraciones', desc: 'Conecta tus sistemas y datos: CRMs, ERPs, pagos, analítica y automatizaciones.' },
        ai: { title: 'IA y Automatización', desc: 'Asistentes inteligentes, RAG, agentes, flujos y copilotos para acelerar procesos.' },
        content: { title: 'Contenido con IA', desc: 'Generación de contenido para marketing y comunicación alineado a tu marca y objetivos.' },
        cloud: { title: 'Nube', desc: 'AWS, Azure y Google Cloud: arquitectura, despliegues, observabilidad y optimización de costos.' }
      }
    },
    projects: {
      title: 'Proyectos',
      card1: { title: 'Automatización con IA', desc: 'Asistente inteligente para soporte, integraciones y respuestas con contexto.' },
      card2: { title: 'Plataforma SaaS', desc: 'Desarrollo full‑stack con foco en onboarding, facturación y analítica de producto.' },
      repo: 'Repositorio'
    },
    about: {
      title: 'Sobre mí',
      description: 'Ayudo a organizaciones en su transformación digital con soluciones escalables, eficientes e innovadoras. Diseño e implemento estrategias que conectan negocio y tecnología para generar valor medible rápidamente.',
      list1: 'Gestión integral de proyectos',
      list2: 'IA aplicada a procesos y productos',
      list3: 'Integraciones y decisiones data‑driven',
      list4: 'Nube, seguridad y rendimiento'
    },
    contact: {
      title: 'Contacto',
      subtitle: '¿Listo para empezar? Agenda una llamada o envíame un mensaje.',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      x: 'X',
      open: 'Abierto a proyectos',
      remote: 'Remoto / Global'
    },
    footer: {
      tagline: 'Soluciones de software e IA para acelerar tu transformación digital.',
      rights: 'Todos los derechos reservados'
    },
    logos: { title: 'Trabajo con' }
  }
};

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


