/* ══════════════════════════════════════════════════════════
   APP.JS — Daxini Systems Interface Boot
   Initializes intersection observers, smooth scroll, and
   dynamic stats.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Smooth scroll nav links ──────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Section reveal on scroll ─────────────────────────── */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section').forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity .6s ease, transform .6s ease';
      observer.observe(el);
    });

    // CSS class for reveal
    var style = document.createElement('style');
    style.textContent = '.section.visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);
  }

  /* ── Dynamic year ─────────────────────────────────────── */
  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── PWA Install Logic ────────────────────────────────── */
  var deferredPrompt;
  var installBtn = document.getElementById('pwa-install-btn');

  window.addEventListener('beforeinstallprompt', function (e) {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then(function (choiceResult) {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
          installBtn.classList.add('hidden');
        } else {
          console.log('User dismissed the PWA install prompt');
        }
        deferredPrompt = null;
      });
    });
  }

  // Register SW for the root as well if needed, but the PWA is in /pwa
  if ('serviceWorker' in navigator) {
    // Check if we are in the PWA path or root
    var swPath = window.location.pathname.startsWith('/pwa/') ? 'sw.js' : '/pwa/sw.js';
    navigator.serviceWorker.register(swPath).catch(function(err) {
      console.log('SW registration failed: ', err);
    });
  }

})();
