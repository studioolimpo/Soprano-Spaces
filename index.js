/*
index.js
Soprano Spaces v1.0

- Registro animazioni hero per namespace
- NO overlay, NO scale
- Transizione pagine: opacita + micro elevate solo in uscita del container corrente
- Crossfade reale current e next con Barba sync true
- Fix robusto: NO flash / NO jump-to-top visibile / NO layer fixed che resta appeso
- NEW: gestione divider reveal via data-reveal="divider"
*/

/*
CODE MAP
- Config + Registry
- Dependencies + Logging
- Global safety + Bootstrap
- Scroll manager
- Global helpers (same-page guard, cursor, signature)
- DOM helpers
- Animations (hero, sections, dividers)
- Loader
- Barba transitions
*/

(function () {
  "use strict";

  /* =========================
  CONFIG
  ========================= */
  const CONFIG = {
    debug: false,
    debugBarbaTimings: true,

    // Lenis manager
    lenis: {
      enabled: true,
      lerp: 0.055,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      useGsapTicker: true,
    },

    // Loader manager
    loader: {
      minDuration: 2000,
      fadeInDuration: 1.5,
      fadeOutDuration: 1.2,
      ease: "power2.inOut",
    },

    // Transition manager
    transition: {
      leaveDuration: 0.8,
      leaveLiftY: -10,
      enterDelay: 0.7,
      enterDuration: 1.0,
      ease: "power2.inOut",
    },

    // Menu manager (nav outside Barba container)
    menu: {
      enabled: true,

      // selectors
      rootSelector: "[data-navigation-status]",
      wrapSelector: ".nav_mobile_wrap",
      bgSelector: ".nav_background",
      linkCloseSelectors: ".nav_mobile_menu_link, .nav_mobile_logo",

      // shift
      shiftTargetSelector: "[data-nav-shift-target]",
      shiftYAttr: "data-nav-shift-y",
      shiftYFallback: 16,

      shiftOpenDuration: 1.0,
      shiftCloseDuration: 0.9,
      shiftOpenEase: "power2.out",
      shiftCloseEase: "power2.inOut",
      shiftCloseDelay: 0.12,

      // theme
      themeName: "brand",
      themeOpenDuration: 0.6,
      themeCloseDuration: 0.45,
      themeEase: "power3.out",

      // panel timing (aligned to CSS)
      panelCloseDuration: 1.0,
      panelCloseOpacityDelay: 0.2,

      // navigation timing (start Barba while menu is closing)
      navTransitionOverlapDelay: 0.08,

      themeResetOverlap: 0.55,
    },

    // Scroll direction handler (nav hide/show on scroll)
    scrollDir: {
      enabled: true,

      // Target element to hide/show (nav is outside Barba container)
      // Default matches your desktop nav wrapper.
      desktopNavSelector: ".nav_desktop_wrap",

      // Keep aligned with your breakpoint conventions
      desktopMinWidth: "60em",

      // Ignore tiny deltas to avoid jitter
      minDelta: 6,

      // Only start hiding after this scroll distance
      startedY: 80,

      // Hide amount (negative moves up)
      desktopHideYPercent: -100,

      // Tween tuning
      tweenDur: 0.7,
      ease: "power2.out",

      // Optional behavior toggles
      setBodyAttributes: true,
      animateOpacity: true,
      respectReducedMotion: true,

      // Barba integration: fade-only restore after virtual scroll-to-top
      transitionFadeDur: 0.3,
    },

    // Slider manager (Swiper, inside Barba container)
    sliders: {
      enabled: true,

      // root selector for slider components (avoid nested)
      componentSelector: "[data-slider]:not([data-slider] [data-slider])",

      // variant selection
      variantAttr: "data-slider-variant",
      defaultVariant: "default",

      // shared defaults
      defaults: {
        slidesPerView: "auto",
        centeredSlides: false,
        autoHeight: false,
        speed: 600,
        loop: false,
        loopAdditionalSlides: 10,

        // input
        followFinger: true,
        freeMode: false,
        mousewheel: false,
        slideToClickedSlide: false,

        // keyboard
        keyboardEnabled: true,
        keyboardOnlyInViewport: true,

        // mousewheel
        mousewheelForceToAxis: true,

        // optional DOM behaviors
        pruneEmptySlides: true,
        hideControlsIfSingle: true,
        setCssSlideCount: true,

        // effects
        effect: "",
        fadeCrossFade: true,
      },

      // per-variant overrides
      variants: {
        // Default slider: scrolling list style, no effect
        default: {
          effect: "",
          pruneEmptySlides: false,
          hideControlsIfSingle: false,
        },

        // Collection slider: component, usually with fade
        collection: {
          effect: "fade",
          pruneEmptySlides: true,
          hideControlsIfSingle: true,
        },
      },
    },

    // Accordion manager (inside Barba container)
    accordions: {
      enabled: true,
      rootSelector: ".accordion_wrap",
      listSelector: ".accordion_list",
      itemSelector: ".accordion_component",
      buttonSelector: ".accordion_toggle_button",
      contentSelector: ".accordion_content_wrap",
      activeClass: "is-active",

      // animation tuning
      duration: 0.4,
      ease: "power2.inOut",
      // subtle motion tuning (kept simple)
      openYOffset: 0,
      animateOpacity: true,
      iconSelector: ".accordion_icon, [data-accordion-icon]",
    },

    // slideshow
    slideshow: {
      enabled: true,

      // root selector (avoid nested init)
      wrapperSelector: ".slideshow-wrapper",

      // default timings (can be overridden via data-attrs on each wrapper)
      startDelaySec: 3.0,

      // optional global override (if finite, overrides per-wrapper attribute)
      delayOverrideSec: null,

      // optional per-namespace overrides (if finite, overrides everything else)
      byNamespace: {
         home: 5.0,
      },
    },

    // Form success overlay (inside Barba container)
    formSuccess: {
      enabled: true,

      // selector for the custom success overlay section
      overlaySelector: "[data-success]",

      // redirect defaults (can be overridden via data-success-redirect + data-success-redirect-delay)
      defaultRedirectUrl: "/",
      defaultRedirectDelay: 1800,

      // success detection polling
      pollTimeout: 8000,
      pollEvery: 120,
    },

    sections: {
      duration: 1.6,
      stagger: 0.3, // stagger tra blocchi above fold
      childStagger: 0.2,
      ease: "power2.out",
      triggerStart: "top 85%",
    },

    // Reveal children stagger [data-reveal-children="stagger"]
    revealChildren: {
      stagger: 0.3,
      duration: 1.8,
      delay: 0.2,
      ease: "power2.out",
      minCount: 2,
    },

    // dividers tuning dedicato (simile a section, ma piu rapido e sobrio)
    dividers: {
      duration: 1.6,
      stagger: 0.3, // se vuoi divider piu ravvicinati sopra fold
      childStagger: 0.12,
      ease: "power2.out",
      triggerStart: "top 92%",
    },

    overlap: {
      loaderToHero: -0.3,
      transitionToHero: 0.2,
      heroToSections: -0.5, // lasciamo il nome per compatibilita, ma ora vale per section + divider
    },

    viewport: {
      aboveThreshold: 0.9,
    },
  };

  /* =========================
  HERO REGISTRY
  ========================= */
  const HERO_REGISTRY = {
    home: {
      duration: 2.2,
      stagger: 0.3,
      mediaFirst: true,
      mediaDelay: 0,
      mediaDuration: 1,
      mediaToContentGap: -0.5,
      revealAnchor: "contentStart",
      revealOffset: -1.5,
      description: "Hero statement con slideshow",
    },

    collection: {
      duration: 1.2,
      stagger: 0.15,
      mediaDelay: 0,
      mediaDuration: 0,
      revealOffset: null,
      description: "Hero titolo + intro",
    },

    villa: {
      duration: 1.6,
      stagger: 0.15,
      mediaDelay: 0.8,
      mediaDuration: 1.8,
      revealAnchor: "done",
      revealOffset: -1.2,
      description: "Hero galleria slider",
    },

    philosophy: {
      duration: 1.8,
      stagger: 0.12,
      mediaFirst: true,
      mediaDelay: 0,
      mediaDuration: 0.9,
      mediaToContentGap: 0,
      revealAnchor: "contentStart",
      revealOffset: -0.06,
      description: "Hero brand con immagine",
    },

    inquire: {
      duration: 1.8,
      stagger: 0.15,
      mediaDelay: 0,
      mediaDuration: 0,
      revealOffset: -1.0,
      description: "Hero form intro",
    },

    apply: {
      duration: 1.8,
      stagger: 0.15,
      mediaDelay: 0,
      mediaDuration: 0,
      revealOffset: null,
      description: "Hero application intro",
    },

    rates: {
      duration: 1.0,
      stagger: 0.1,
      mediaDelay: 0,
      mediaDuration: 0,
      revealOffset: null,
      description: "Hero titolo semplice",
    },

    error: {
      duration: 1.3,
      stagger: 0.12,
      mediaDelay: 0.2,
      mediaDuration: 1.5,
      revealOffset: null,
      description: "Hero errore con immagine",
    },
  };

  const HERO_DEFAULT = {
    duration: 1.2,
    stagger: 0.12,
    mediaDelay: 0.2,
    mediaDuration: 1.4,
    revealOffset: null,
    description: "Default hero",
  };

  /* =========================
  DEPENDENCIES
  ========================= */
  const { gsap, barba, ScrollTrigger } = window;
  const Lenis = window.Lenis; // optional
  const $ = window.jQuery || window.$;
  /* =========================
     FORM SUCCESS (custom overlay, per-container)
     - binds ONLY our submit handler (namespaced) without breaking Webflow
     - detects real Webflow success state before showing overlay
     - navigates via Barba when available, with safe fallback
     - cleanup does NOT remove Webflow handlers
  ========================= */

  function initFormSuccessTransition(scope = document) {
    if (!CONFIG.formSuccess?.enabled) return () => {};
    if (!$) return () => {};
    if (!gsap) return () => {};

    const NS_EVENT = ".soFormSuccess";

    const $root = $(scope);
    const $forms = $root.find(".w-form form");
    if (!$forms.length) return () => {};

    const DEFAULT_REDIRECT_URL = CONFIG.formSuccess.defaultRedirectUrl;
    const DEFAULT_REDIRECT_DELAY = CONFIG.formSuccess.defaultRedirectDelay;
    const DEFAULT_POLL_TIMEOUT = CONFIG.formSuccess.pollTimeout;
    const POLL_EVERY = CONFIG.formSuccess.pollEvery;

    // Track all timers per init call so cleanup is deterministic
    const timers = new Set();
    const addTimer = (t) => {
      if (t != null) timers.add(t);
      return t;
    };
    const clearAllTimers = () => {
      timers.forEach((t) => {
        try { clearTimeout(t); } catch (_) {}
      });
      timers.clear();
    };

    function hideNativeMessagesAfterDetection($container) {
      $container.find(".w-form-done, .w-form-fail").each(function () {
        this.style.opacity = "0";
        this.style.visibility = "hidden";
        this.style.position = "absolute";
        this.style.pointerEvents = "none";
      });
    }

    function freezeFormHeight($wForm) {
      const $section = $wForm.closest("section.u-section");
      const $formComponent = $wForm.closest(".form_component");

      if ($section.length) {
        const sectionHeight = $section.outerHeight();
        if (sectionHeight > 0) {
          $section.css({ minHeight: sectionHeight + "px", transition: "none" });
        }
      }

      if ($formComponent.length) {
        const componentHeight = $formComponent.outerHeight();
        if (componentHeight > 0) {
          $formComponent.css({
            height: componentHeight + "px",
            minHeight: componentHeight + "px",
            overflow: "hidden",
            transition: "none",
          });
        }
      }

      const wFormHeight = $wForm.outerHeight();
      if (wFormHeight > 0) {
        $wForm.css({
          height: wFormHeight + "px",
          minHeight: wFormHeight + "px",
          overflow: "hidden",
          transition: "none",
        });
      }
    }

    function fadeInSuccess(successSection) {
      successSection.style.display = "flex";
      successSection.style.pointerEvents = "auto";
      successSection.style.position = "fixed";
      successSection.style.inset = "0";
      successSection.style.zIndex = "9999";

      gsap.killTweensOf(successSection);
      gsap.set(successSection, { autoAlpha: 0 });
      gsap.to(successSection, { autoAlpha: 1, duration: 0.9, ease: "power2.out" });
    }

    function fadeOutSuccess(successSection, onComplete) {
      if (!successSection) return;

      gsap.killTweensOf(successSection);

      gsap.set(successSection, {
        willChange: "opacity, transform, filter",
        transformOrigin: "50% 50%",
        pointerEvents: "none",
      });

      const tl = gsap.timeline({
        onComplete: () => {
          successSection.style.display = "none";
          successSection.style.willChange = "";
          successSection.style.filter = "";
          successSection.style.transform = "";
          if (typeof onComplete === "function") onComplete();
        },
      });

      tl.to(successSection, {
        duration: 0.9,
        ease: "expo.inOut",
        autoAlpha: 0,
        y: 10,
        filter: "blur(1px)",
      });
    }

    function navigateThenHideOverlay(redirectUrl, successSection) {
      // If Barba is not available, fall back to hard navigation.
      if (!barba || typeof barba.go !== "function") {
        window.location.href = redirectUrl;
        return;
      }

      let done = false;

      const safeFadeOut = () => {
        if (done) return;
        done = true;
        fadeOutSuccess(successSection);
      };

      // Safety timeout: never leave overlay stuck.
      const SAFETY_TIMEOUT = 4000;
      const safetyTimer = addTimer(setTimeout(safeFadeOut, SAFETY_TIMEOUT));

      let maybePromise;
      try {
        maybePromise = barba.go(redirectUrl);
      } catch {
        try { clearTimeout(safetyTimer); } catch (_) {}
        window.location.href = redirectUrl;
        return;
      }

      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise
          .then(() => {
            try { clearTimeout(safetyTimer); } catch (_) {}
            safeFadeOut();
          })
          .catch(() => {
            try { clearTimeout(safetyTimer); } catch (_) {}
            safeFadeOut();
          });
        return;
      }

      // FIX: Barba hooks do not support unregistering; rely on `done` guard.
      const afterEnterOnce = () => {
        try { clearTimeout(safetyTimer); } catch (_) {}
        safeFadeOut();
      };

      if (barba.hooks && typeof barba.hooks.afterEnter === "function") {
        barba.hooks.afterEnter(afterEnterOnce);
      }
    }

    function showSuccessAndRedirect($form) {
      if ($form.data("__successHandled")) return;
      $form.data("__successHandled", true);

      const $wForm = $form.closest(".w-form");
      const $fail = $wForm.find(".w-form-fail");
      if ($fail.is(":visible")) return;

      freezeFormHeight($wForm);
      hideNativeMessagesAfterDetection($wForm);

      // Hide only the form element without collapsing layout.
      $form.css({
        opacity: "0",
        pointerEvents: "none",
        visibility: "hidden",
      });

      // Overlay can be outside Barba container, so query from document.
      const successSection = document.querySelector(CONFIG.formSuccess.overlaySelector);
      if (!successSection) return;

      fadeInSuccess(successSection);

      const redirectUrl = successSection.getAttribute("data-success-redirect") || DEFAULT_REDIRECT_URL;
      const redirectDelay =
        Number(successSection.getAttribute("data-success-redirect-delay")) || DEFAULT_REDIRECT_DELAY;

      // Store redirect timer so cleanup can cancel it on transitions.
      const t = addTimer(
        setTimeout(() => {
          navigateThenHideOverlay(redirectUrl, successSection);
        }, Math.max(0, redirectDelay))
      );

      $form.data("__successRedirectTimer", t);
    }

    function waitForWebflowSuccess($form) {
      const $wForm = $form.closest(".w-form");
      const start = Date.now();

      const isVisibleFast = (el) => {
        if (!el) return false;
        try {
          if (typeof el.getClientRects === "function" && el.getClientRects().length === 0) return false;
          const cs = window.getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
          return true;
        } catch {
          return false;
        }
      };

      const tick = () => {
        const doneEl = $wForm.find(".w-form-done")[0] || null;
        const failEl = $wForm.find(".w-form-fail")[0] || null;
        const formEl = $wForm.find("form")[0] || null;

        if (isVisibleFast(failEl)) return;

        const doneVisible = isVisibleFast(doneEl);
        const doneStyleBlock = doneEl && doneEl.style.display === "block";
        const formHidden = formEl ? !isVisibleFast(formEl) : false;
        const formStyleNone = formEl && formEl.style.display === "none";

        const successDetected = (doneVisible || doneStyleBlock) && (formHidden || formStyleNone);

        if (successDetected) {
          showSuccessAndRedirect($form);
          return;
        }

        if (Date.now() - start > DEFAULT_POLL_TIMEOUT) return;

        const nextTick = addTimer(setTimeout(tick, POLL_EVERY));
        $form.data("__successPollTimer", nextTick);
      };

      // Initial small delay to avoid reading transient states right after submit.
      const first = addTimer(setTimeout(tick, 120));
      $form.data("__successPollTimer", first);
    }

    // Bind submit handler (namespaced) per form, without breaking Webflow.
    $forms.each(function () {
      const $form = $(this);
      if ($form.data("bound-success")) return;
      $form.data("bound-success", true);

      // IMPORTANT: do not preventDefault here; Webflow needs to run its own handler.
      $form.on("submit" + NS_EVENT, function () {
        const $wForm = $form.closest(".w-form");
        freezeFormHeight($wForm);
        waitForWebflowSuccess($form);
      });
    });

    return () => {
      // Remove ONLY our handlers/timers; keep Webflow intact.
      $forms.each(function () {
        const $form = $(this);

        const tPoll = $form.data("__successPollTimer");
        const tRedir = $form.data("__successRedirectTimer");
        try { if (tPoll != null) clearTimeout(tPoll); } catch (_) {}
        try { if (tRedir != null) clearTimeout(tRedir); } catch (_) {}

        try { $form.off(NS_EVENT); } catch (_) {}
        try { $form.removeData("bound-success"); } catch (_) {}
        try { $form.removeData("__successHandled"); } catch (_) {}
        try { $form.removeData("__successPollTimer"); } catch (_) {}
        try { $form.removeData("__successRedirectTimer"); } catch (_) {}
      });

      clearAllTimers();
    };
  }

  // Back-compat alias (existing call sites)
  const initFormSuccess = initFormSuccessTransition;

  if (!gsap) return console.warn("[CORE] GSAP mancante");
  if (!barba) return console.warn("[CORE] Barba mancante");
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const log = (...args) => CONFIG.debug && console.log("[CORE]", ...args);

  /* =========================
  GLOBAL SAFETY (avoid Barba crashes on optional component init)
  ========================= */

  function bindGlobalSafetyOnce() {
    if (window.__coreSafetyBound) return;
    window.__coreSafetyBound = true;

    window.addEventListener("unhandledrejection", (e) => {
      const reason = e?.reason;
      const msg = reason?.message || String(reason || "");

      // Known optional component: checkout popup (skip hard failure)
      if (msg.includes("No checkout popup config found")) {
        console.warn("[CORE] Optional checkout popup config missing, ignoring:", reason);
        try { e.preventDefault(); } catch (_) {}
        return;
      }

      console.warn("[CORE] Unhandled promise rejection:", reason);
    });

    window.addEventListener("error", (e) => {
      const msg = e?.message || "";
      if (msg.includes("No checkout popup config found")) {
        console.warn("[CORE] Optional checkout popup error, ignoring:", e.error || e);
        try { e.preventDefault(); } catch (_) {}
        return;
      }
    });
  }

  // Bind safety net ASAP (before any optional inits) — one time
  bindGlobalSafetyOnce();

  /* =========================
  UTILITIES
  ========================= */
  function getNamespace(container) {
    return container?.getAttribute("data-barba-namespace") || "default";
  }

  function getRoot(scope) {
    return scope && typeof scope.querySelectorAll === "function" ? scope : document;
  }

  /* =========================
     WEBFLOW RE-INIT (Forms)
     - With Barba, Webflow's form AJAX binding can be lost on next containers.
     - If forms are not re-bound, submit falls back to native POST -> hard refresh.
     - Keep this narrowly scoped to forms to avoid side effects.
  ========================= */

  function reinitWebflowForms() {
    const wf = window.Webflow;
    if (!wf) return;

    // Best-effort: re-bind Webflow form handlers after Barba DOM swap.
    try {
      if (typeof wf.require === "function") {
        const forms = wf.require("forms");
        if (forms && typeof forms.ready === "function") forms.ready();
      }
    } catch (_) {}

    // Some builds expose Webflow.ready() which re-runs modules.
    // Keep it guarded and non-fatal.
    try {
      if (typeof wf.ready === "function") wf.ready();
    } catch (_) {}
  }

  // Re-bind forms on BFCache restore / tab resume (prevents "idle then submit -> reload")
  function bindWebflowFormsResumeOnce() {
    if (window.__wfFormsResumeBound) return;
    window.__wfFormsResumeBound = true;

    window.addEventListener("pageshow", (e) => {
      if (e && e.persisted) {
        try { reinitWebflowForms(); } catch (_) {}
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        try { reinitWebflowForms(); } catch (_) {}
      }
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function prefersReducedMotion() {
    return (
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }



  function isDesktop() {
    return !!window.matchMedia && window.matchMedia("(min-width: 60em)").matches;
  }


  /* =========================
     LANGUAGE SWITCHER (Webflow i18n)
     - Forces hard reload when switching language for the same page
     - EN is primary (root), IT is secondary (/it)
     - Avoids Barba transitions by destroying Barba before navigation
  ========================= */

  function initLanguageSwitcher() {
    document.querySelectorAll("a[href]").forEach((link) => {
      link.removeEventListener("click", handleLangSwitch);
      link.addEventListener("click", handleLangSwitch);
    });
  }

  function handleLangSwitch(e) {
    const link = e.currentTarget;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || link.target === "_blank") return;

    let currentURL;
    let nextURL;

    try {
      currentURL = new URL(window.location.href);
      nextURL = new URL(href, window.location.origin);
    } catch {
      return;
    }

    // Se stai cliccando sullo stesso URL attuale, non fare nulla
    if (currentURL.pathname === nextURL.pathname) {
      return;
    }

    // EN è primary (root), IT è secondary (/it)
    const currentLang = currentURL.pathname.startsWith("/it") ? "it" : "en";
    const nextLang = nextURL.pathname.startsWith("/it") ? "it" : "en";

    // Normalizza rimuovendo /it e slash finale
    const normalizePath = (path) => path.replace(/^\/it/, "").replace(/\/$/, "") || "/";
    const currentPathNormalized = normalizePath(currentURL.pathname);
    const nextPathNormalized = normalizePath(nextURL.pathname);

    const isSamePath = currentPathNormalized === nextPathNormalized;
    const isLangChange = currentLang !== nextLang;

    if (isSamePath && isLangChange) {
      e.preventDefault();

      // Disattiva Barba e forza reload completo
      try {
        if (window.barba && typeof window.barba.destroy === "function") {
          window.barba.destroy();
        } else if (typeof barba !== "undefined" && barba && typeof barba.destroy === "function") {
          barba.destroy();
        }
      } catch (_) {}

      window.location.href = nextURL.href;
    }
  }

  function flattenDisplayContents(slot) {
    if (!slot) return;
    let child = slot.firstElementChild;
    while (child && child.classList.contains("u-display-contents")) {
      while (child.firstChild) slot.insertBefore(child.firstChild, child);
      slot.removeChild(child);
      child = slot.firstElementChild;
    }
  }

  function pruneEmptySlides(wrapper) {
    if (!wrapper) return;

    // Webflow lazy-load often uses a placeholder `src` + real `data-src` / `data-srcset`.
    // We must NOT remove those slides, otherwise Swiper can end up with 0 slides and crash.
    const PLACEHOLDER_RE = /\/plugins\/Basic\/assets\/placeholder\./i;

    [...wrapper.children].forEach((slide) => {
      // Remove Webflow conditional invisibles
      if (slide.classList.contains("w-condition-invisible")) {
        slide.remove();
        return;
      }

      const img = slide.querySelector("img");
      if (!img) {
        // If there is no image at all, the slide is considered empty for our use case
        slide.remove();
        return;
      }

      const src = (img.getAttribute("src") || "").trim();
      const dataSrc = (img.getAttribute("data-src") || "").trim();
      const dataSrcset = (img.getAttribute("data-srcset") || "").trim();
      const srcset = (img.getAttribute("srcset") || "").trim();

      const hasDeferredRealSource = !!(dataSrc || dataSrcset);
      const hasAnyRealSource = !!(src || srcset || hasDeferredRealSource);

      // Remove slides that truly have no usable source
      if (!hasAnyRealSource || src === "#" || src === "about:blank") {
        slide.remove();
        return;
      }

      // If src is a Webflow placeholder BUT a deferred real source exists, keep the slide.
      if (src && PLACEHOLDER_RE.test(src) && hasDeferredRealSource) {
        return;
      }

      // If it's placeholder and there is no deferred real source, remove the slide.
      if (src && PLACEHOLDER_RE.test(src) && !hasDeferredRealSource) {
        slide.remove();
        return;
      }
    });
  }

  function getHeroConfig(namespace) {
    const config = HERO_REGISTRY[namespace] || HERO_DEFAULT;
    log(`Hero config for "${namespace}":`, config.description);
    return config;
  }

  function killAllScrollTriggers() {
    if (!ScrollTrigger) return;
    try {
      ScrollTrigger.getAll().forEach((t) => t.kill(true));
    } catch (e) {
      log("ScrollTrigger killAll errore:", e);
    }
  }

  /* =========================
  SCROLL MANAGER (Lenis + lock/unlock)
  ========================= */

  const Scroll = {
    lenis: null,
    locked: false,
    _tickerFn: null,
    _onLenisScroll: null,

    initLenis() {
      if (!CONFIG.lenis?.enabled) return;
      if (!Lenis) {
        log("Lenis not found, fallback to native scroll");
        return;
      }

      // Ensure clean state (important for BFCache / tab resume)
      this.destroyLenis();

      this.lenis = new Lenis({
        lerp: CONFIG.lenis.lerp,
        wheelMultiplier: CONFIG.lenis.wheelMultiplier,
        touchMultiplier: CONFIG.lenis.touchMultiplier,
      });

      window.lenis = this.lenis;

      if (CONFIG.lenis.useGsapTicker && gsap && gsap.ticker) {
        this._onLenisScroll = () => {
          try {
            if (ScrollTrigger) ScrollTrigger.update();
          } catch (_) {}
        };

        try {
          if (ScrollTrigger) this.lenis.on("scroll", this._onLenisScroll);
        } catch (_) {}

        this._tickerFn = (time) => {
          try {
            // GSAP ticker time is in seconds, Lenis expects ms
            this.lenis.raf(time * 1000);
          } catch (_) {}
        };

        gsap.ticker.add(this._tickerFn);
        try {
          gsap.ticker.lagSmoothing(0);
        } catch (_) {}

        log("Lenis init (GSAP ticker)");
        return;
      }

      log("Lenis init (no ticker integration)");
    },

    destroyLenis() {
      if (this._tickerFn && gsap && gsap.ticker) {
        try {
          gsap.ticker.remove(this._tickerFn);
        } catch (_) {}
      }
      this._tickerFn = null;

      if (this.lenis && this._onLenisScroll) {
        try {
          this.lenis.off("scroll", this._onLenisScroll);
        } catch (_) {}
      }
      this._onLenisScroll = null;

      try {
        if (this.lenis && this.lenis.destroy) this.lenis.destroy();
      } catch (_) {}

      this.lenis = null;
      if (window.lenis) {
        try {
          delete window.lenis;
        } catch (_) {
          window.lenis = null;
        }
      }
    },

    lock() {
      this.locked = true;
      if (this.lenis && this.lenis.stop) {
        try {
          this.lenis.stop();
        } catch (_) {}
      } else {
        document.documentElement.classList.add("is-scroll-locked");
        document.body.classList.add("is-scroll-locked");
      }
    },

    unlock() {
      this.locked = false;
      if (this.lenis && this.lenis.start) {
        try {
          this.lenis.start();
        } catch (_) {}
      } else {
        document.documentElement.classList.remove("is-scroll-locked");
        document.body.classList.remove("is-scroll-locked");
      }
    },

    scrollToTopImmediate() {
      if (this.lenis && this.lenis.scrollTo) {
        try {
          this.lenis.scrollTo(0, { immediate: true });
        } catch (_) {}
      }
      try {
        window.scrollTo(0, 0);
      } catch (_) {}
      try {
        document.documentElement.scrollTop = 0;
      } catch (_) {}
      try {
        document.body.scrollTop = 0;
      } catch (_) {}
    },

    bindResumeHandlersOnce() {
      if (this._resumeBound) return;
      this._resumeBound = true;

      // BFCache restore
      window.addEventListener("pageshow", (e) => {
        if (e && e.persisted) {
          try {
            Scroll.initLenis();
          } catch (_) {}
          try {
            if (ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh(true));
          } catch (_) {}
        }
      });

      // Tab resume
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          try {
            if (!Scroll.locked && Scroll.lenis && Scroll.lenis.start) Scroll.lenis.start();
          } catch (_) {}
          try {
            if (ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh(true));
          } catch (_) {}
        }
      });
    },
  };

  // Local helpers (keep existing call sites unchanged)
  const scrollLock = () => Scroll.lock();
  const scrollUnlock = () => Scroll.unlock();
  const hardScrollTop = () => Scroll.scrollToTopImmediate();

  // Minimal global API (useful for overlays/menus)
  window.AppScroll = {
    lock: () => Scroll.lock(),
    unlock: () => Scroll.unlock(),
  };

  /* =========================
     PREVENT SAME PAGE CLICKS (global, one time)
  ========================= */

  function preventSamePageClicks() {
    if (window.__samePageGuardBound) return;
    window.__samePageGuardBound = true;

    const norm = (p) =>
      (p || "").replace(/\/index\.html?$/i, "").replace(/\/+$/g, "") || "/";

    const isSkippable = (a, e) => {
      const href = a.getAttribute("href") || "";
      const h = href.trim().toLowerCase();
      return (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button === 1 ||
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        a.rel === "external" ||
        a.dataset.allowSame === "true" ||
        !href ||
        h === "#" ||
        h === "" ||
        h.startsWith("javascript:") ||
        h.startsWith("mailto:") ||
        h.startsWith("tel:")
      );
    };

    const getOffset = () =>
      parseFloat(document.documentElement.getAttribute("data-anchor-offset") || "0") || 0;

    const getTarget = (hash) => {
      if (!hash) return null;
      const id = decodeURIComponent(hash.slice(1));
      return (
        document.getElementById(id) ||
        document.querySelector(`#${CSS?.escape ? CSS.escape(id) : id}`)
      );
    };

    document.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest("a[href]");
        if (!a || isSkippable(a, e)) return;

        let dest;
        try {
          dest = new URL(a.getAttribute("href"), location.href);
        } catch {
          return;
        }
        if (dest.origin !== location.origin) return;

        const sameBase =
          norm(dest.pathname) === norm(location.pathname) &&
          dest.search === location.search;
        if (!sameBase) return;

        e.preventDefault();

        const offset = getOffset();
        if (dest.hash) {
          const target = getTarget(dest.hash);
          if (target) {
            window.lenis?.scrollTo
              ? window.lenis.scrollTo(target, { offset: -offset })
              : target.scrollIntoView({ behavior: "smooth" });
            return;
          }
        }

        if ((window.scrollY || 0) < 2) return;
        window.lenis?.scrollTo
          ? window.lenis.scrollTo(0)
          : window.scrollTo({ top: 0, behavior: "smooth" });
      },
      true
    );
  }


  /* =========================
     SIGNATURE (global, one time)
  ========================= */

  function initSignature() {
    if (window.__signatureInit) return;
    window.__signatureInit = true;

    if (!window.console || typeof window.console.log !== "function") return;

    console.log(
      "%cCredits: Studio Olimpo | Above the ordinary – %chttps://www.studioolimpo.it",
      "background:#F8F6F1; color:#000; font-size:12px; padding:10px 0 10px 14px;",
      "background:#F8F6F1; color:#000; font-size:12px; padding:10px 14px 10px 0; text-decoration:none;"
    );
  }


  /* =========================
     initMenu()
  ========================= */

  function initMenu(scope = document) {
    if (!CONFIG.menu.enabled) return () => {};
    const root = getRoot(scope);
    const navEls = root.querySelectorAll(CONFIG.menu.rootSelector);
    if (!navEls.length) return () => {};

    const cleanups = [];

    navEls.forEach((navEl) => {
      if (navEl.dataset.scriptInitialized === "true") return;
      navEl.dataset.scriptInitialized = "true";

      const navWrap = navEl.querySelector(CONFIG.menu.wrapSelector) || navEl;
      const navBg = navEl.querySelector(CONFIG.menu.bgSelector) || document.querySelector(CONFIG.menu.bgSelector);

      const getShiftTarget = () =>
        document.querySelector(CONFIG.menu.shiftTargetSelector) ||
        document.querySelector('[data-barba="container"]') ||
        document.querySelector("main") ||
        document.body;

      const SHIFT_Y = parseFloat(navEl.getAttribute(CONFIG.menu.shiftYAttr) || "") || CONFIG.menu.shiftYFallback;

      const getStatus = () => navEl.getAttribute("data-navigation-status");
      const setStatus = (value) => navEl.setAttribute("data-navigation-status", value);

      const shiftPageDown = () => {
        const shiftTarget = getShiftTarget();
        if (!shiftTarget) return;
        gsap.killTweensOf(shiftTarget);
        gsap.to(shiftTarget, {
          y: SHIFT_Y,
          duration: CONFIG.menu.shiftOpenDuration,
          ease: CONFIG.menu.shiftOpenEase,
          overwrite: "auto",
        });
      };

      const shiftPageUp = (delaySec = 0) => {
        const shiftTarget = getShiftTarget();
        if (!shiftTarget) return;
        gsap.killTweensOf(shiftTarget);
        gsap.to(shiftTarget, {
          y: 0,
          delay: Math.max(0, Number(delaySec) || 0),
          duration: CONFIG.menu.shiftCloseDuration,
          ease: CONFIG.menu.shiftCloseEase,
          overwrite: "auto",
        });
      };

      const getThemeVars = (themeName) => {
        try {
          if (!window.colorThemes || typeof window.colorThemes.getTheme !== "function") return null;
          return window.colorThemes.getTheme(themeName);
        } catch {
          return null;
        }
      };

      const snapshotCurrentVars = (keys) => {
        if (!navWrap || !keys || !keys.length) return null;
        const cs = window.getComputedStyle(navWrap);
        const out = {};
        keys.forEach((k) => {
          const v = cs.getPropertyValue(k);
          if (v != null) out[k] = String(v).trim();
        });
        return out;
      };

      const tweenToVars = (vars, duration) => {
        if (!navWrap || !vars) return;
        gsap.killTweensOf(navWrap);
        gsap.to(navWrap, {
          ...vars,
          duration,
          ease: CONFIG.menu.themeEase,
          overwrite: "auto",
        });
      };

      navEl.__themeSnapshot = navEl.__themeSnapshot || null;

      const forceThemeBrand = () => {
        const brandVars = getThemeVars(CONFIG.menu.themeName);
        if (!brandVars) return;

        tweenToVars(brandVars, CONFIG.menu.themeOpenDuration);
        navWrap?.setAttribute?.("data-theme", CONFIG.menu.themeName);

        if (navBg) {
          gsap.killTweensOf(navBg);
          gsap.to(navBg, {
            autoAlpha: 1,
            duration: CONFIG.menu.themeOpenDuration,
            ease: CONFIG.menu.themeEase,
            overwrite: "auto",
          });
        }
      };

      const restorePreviousTheme = (snap = navEl.__themeSnapshot) => {
        if (!navWrap) return;
        const s = snap;

        if (!s) {
          try {
            navWrap.removeAttribute("data-theme");
            navWrap.removeAttribute("style");
          } catch {}
          if (navBg) {
            try { navBg.removeAttribute("style"); } catch {}
          }
          return;
        }

        if (s.varsSnapshot) tweenToVars(s.varsSnapshot, CONFIG.menu.themeCloseDuration);

        if (navBg) {
          gsap.killTweensOf(navBg);
          gsap.to(navBg, {
            autoAlpha: Number.isFinite(s.bgAutoAlpha) ? s.bgAutoAlpha : 0,
            duration: CONFIG.menu.themeCloseDuration,
            ease: CONFIG.menu.themeEase,
            overwrite: "auto",
          });
        }

        const finalizeRestore = () => {
          try {
            if (s.wrapStyle) navWrap.setAttribute("style", s.wrapStyle);
            else navWrap.removeAttribute("style");

            if (navBg) {
              if (s.bgStyle) navBg.setAttribute("style", s.bgStyle);
              else navBg.removeAttribute("style");
            }

            if (s.hadThemeAttr) {
              if (s.themeAttr != null && s.themeAttr !== "") navWrap.setAttribute("data-theme", s.themeAttr);
              else navWrap.removeAttribute("data-theme");
            } else {
              navWrap.removeAttribute("data-theme");
            }
          } catch {}

          if (navEl.__themeSnapshot === s) navEl.__themeSnapshot = null;
        };

        gsap.delayedCall(CONFIG.menu.themeCloseDuration, finalizeRestore);
      };

      let isNavTransitioning = false;

      const getToggleButtons = () =>
        Array.from(navEl.querySelectorAll('[data-navigation-toggle="toggle"], [data-navigation-toggle="close"]'));

      const setTogglesEnabled = (enabled) => {
        const btns = getToggleButtons();
        btns.forEach((btn) => {
          btn.style.pointerEvents = enabled ? "" : "none";
          btn.style.cursor = enabled ? "" : "wait";
          if (btn.tagName === "BUTTON") btn.disabled = !enabled;
          btn.setAttribute("aria-disabled", enabled ? "false" : "true");
        });
      };

      const withNavTransitionLock = (fn, durationSeconds) => {
        if (isNavTransitioning) return;
        isNavTransitioning = true;
        setTogglesEnabled(false);

        try { fn?.(); } catch {
          isNavTransitioning = false;
          setTogglesEnabled(true);
          return;
        }

        const unlock = () => {
          isNavTransitioning = false;
          setTogglesEnabled(true);
        };

        gsap.delayedCall(Math.max(0, Number(durationSeconds || 0)), unlock);
      };

      const openNav = () => {
        const LOCK_DUR = Math.max(CONFIG.menu.themeOpenDuration, 0.6);

        withNavTransitionLock(() => {
          const brandVars = getThemeVars(CONFIG.menu.themeName);
          const brandKeys = brandVars ? Object.keys(brandVars) : [];

          navEl.__themeSnapshot = {
            hadThemeAttr: !!navWrap?.hasAttribute?.("data-theme"),
            themeAttr: navWrap?.getAttribute?.("data-theme"),
            wrapStyle: navWrap?.getAttribute?.("style") || "",
            bgStyle: navBg?.getAttribute?.("style") || "",
            varsSnapshot: brandKeys.length ? snapshotCurrentVars(brandKeys) : null,
            bgAutoAlpha: navBg ? parseFloat(window.getComputedStyle(navBg).opacity || "0") : 0,
          };

          setStatus("active");

          try { Scroll.lock(); } catch {}

          forceThemeBrand();
          shiftPageDown();
        }, LOCK_DUR);
      };

      const closeNav = () => {
        const CLOSE_TOTAL_DURATION = CONFIG.menu.panelCloseDuration + CONFIG.menu.panelCloseOpacityDelay;
        const CLOSE_THEME_RESET_AT = CLOSE_TOTAL_DURATION * CONFIG.menu.themeResetOverlap;

        const LOCK_DUR = Math.max(CLOSE_TOTAL_DURATION, CONFIG.menu.themeCloseDuration, 0.6);

        withNavTransitionLock(() => {
          setStatus("not-active");
          shiftPageUp(CONFIG.menu.shiftCloseDelay);

          try { Scroll.unlock(); } catch {}

          const snap = navEl.__themeSnapshot;

          gsap.delayedCall(CLOSE_THEME_RESET_AT, () => restorePreviousTheme(snap));
        }, LOCK_DUR);
      };

      const normPath = (path) =>
        (path || "").replace(/\/index\.html?$/i, "").replace(/\/+$/g, "") || "/";

      const isSameDestination = (anchorEl) => {
        if (!anchorEl) return false;
        const href = anchorEl.getAttribute("href");
        if (!href || href === "#") return false;

        let dest;
        try { dest = new URL(href, window.location.href); } catch { return false; }
        if (dest.origin !== window.location.origin) return false;

        const curPath = normPath(window.location.pathname);
        const destPath = normPath(dest.pathname);

        const samePath = destPath === curPath;
        const sameQuery = dest.search === window.location.search;
        const sameHash = (dest.hash || "") === (window.location.hash || "");

        return samePath && sameQuery && sameHash;
      };

      const onToggle = (e) => {
        e.preventDefault();
        if (isNavTransitioning) return;
        const isOpen = getStatus() === "active";
        isOpen ? closeNav() : openNav();
      };

      const onClose = (e) => {
        e.preventDefault();
        if (isNavTransitioning) return;
        closeNav();
      };

      navEl.querySelectorAll('[data-navigation-toggle="toggle"]').forEach((btn) => {
        btn.addEventListener("click", onToggle);
      });

      navEl.querySelectorAll('[data-navigation-toggle="close"]').forEach((btn) => {
        btn.addEventListener("click", onClose);
      });

      // Link clicks inside mobile nav
      // Goal: close nav (theme restore preserved) AND start Barba transition in overlap.
      navEl.querySelectorAll(CONFIG.menu.linkCloseSelectors).forEach((link) => {
        const onLink = (e) => {
          if (isNavTransitioning) return;

          const hrefRaw = (link.getAttribute("href") || "").trim();
          if (!hrefRaw || hrefRaw === "#" || hrefRaw.startsWith("#")) return;
          if (link.target === "_blank") return;

          // If nav isn't open, do nothing special.
          const isOpen = getStatus() === "active";
          if (!isOpen) return;

          // Resolve destination
          let dest;
          try {
            dest = new URL(hrefRaw, window.location.href);
          } catch {
            return;
          }

          // External links: allow default behavior, but still close nav quickly.
          if (dest.origin !== window.location.origin) {
            closeNav();
            return;
          }

          // Same destination: just close (no navigation)
          if (isSameDestination(link)) {
            e.preventDefault();
            try { e.stopImmediatePropagation(); } catch (_) {}
            try { e.stopPropagation(); } catch (_) {}
            closeNav();
            return;
          }

          // Different internal page: we own the navigation.
          e.preventDefault();
          try { e.stopImmediatePropagation(); } catch (_) {}
          try { e.stopPropagation(); } catch (_) {}

          // Start close immediately (keeps your theme restore + scroll unlock timings)
          console.log("[NAV] closeNav() chiamato", performance.now());
          closeNav();

          const OVERLAP_DELAY = Number.isFinite(Number(CONFIG.menu.navTransitionOverlapDelay))
            ? Number(CONFIG.menu.navTransitionOverlapDelay)
            : 0.25;

          console.log("[NAV] OVERLAP_DELAY =", OVERLAP_DELAY);

          // Prevent double navigation if something else triggers it
          if (navEl.__pendingNavCall && typeof navEl.__pendingNavCall.kill === "function") {
            try { navEl.__pendingNavCall.kill(); } catch (_) {}
          }

          const go = () => {
            console.log("[NAV] barba.go() chiamato", performance.now());
            // Prefer Barba, fallback to hard navigation
            try {
              if (barba && typeof barba.go === "function") {
                barba.go(dest.href);
                return;
              }
            } catch (_) {}
            window.location.href = dest.href;
          };

          try {
            navEl.__pendingNavCall = gsap.delayedCall(Math.max(0, OVERLAP_DELAY), go);
          } catch (_) {
            const t = setTimeout(go, Math.max(0, OVERLAP_DELAY) * 1000);
            navEl.__pendingNavCall = { kill: () => clearTimeout(t) };
          }
        };

        // Use capture so we run before Barba/Webflow click handlers.
        link.addEventListener("click", onLink, true);

        // store for deterministic cleanup
        link.__soMenuLinkHandler = onLink;
      });

      // ESC
      const escHandler = (e) => {
        if (e.key === "Escape" && getStatus() === "active") closeNav();
      };
      document.addEventListener("keydown", escHandler);

      cleanups.push(() => {
        try { document.removeEventListener("keydown", escHandler); } catch (_) {}

        // kill any pending delayed navigation
        try { navEl.__pendingNavCall?.kill?.(); } catch (_) {}
        navEl.__pendingNavCall = null;

        // remove our captured link handlers
        try {
          navEl.querySelectorAll(CONFIG.menu.linkCloseSelectors).forEach((link) => {
            const h = link.__soMenuLinkHandler;
            if (h) {
              try { link.removeEventListener("click", h, true); } catch (_) {}
              link.__soMenuLinkHandler = null;
            }
          });
        } catch (_) {}

        delete navEl.dataset.scriptInitialized;
      });
    });

    return () => cleanups.forEach((fn) => { try { fn(); } catch {} });
  }


  /* =========================
     SCROLL DIRECTION (global, one time)
     - Nav is outside Barba container, so we init only at bootstrap.
     - Updates body attributes for CSS hooks.
     - Desktop only: hides nav on scroll down after threshold, shows on scroll up.
  ========================= */

  let ScrollDir = null; // controller returned by initDetectScrollingDirection
  let __scrollDirBarbaHooksBound = false;

  function initDetectScrollingDirection() {
    if (!CONFIG.scrollDir?.enabled) {
      return { pause: () => {}, reset: () => {}, cleanup: () => {} };
    }
    if (!gsap) {
      return { pause: () => {}, reset: () => {}, cleanup: () => {} };
    }

    // If re-called (BFCache / hot reload), cleanup previous instance first.
    try {
      if (ScrollDir && typeof ScrollDir.cleanup === "function") ScrollDir.cleanup();
    } catch (_) {}

    const reduceMotion = prefersReducedMotion();
    if (CONFIG.scrollDir.respectReducedMotion !== false && reduceMotion) {
      // Still expose attributes for CSS logic, but skip tweening.
      try {
        document.body.setAttribute("data-scrolling-direction", "up");
        document.body.setAttribute("data-scrolling-started", "false");
      } catch (_) {}
      const noop = { pause: () => {}, reset: () => {}, cleanup: () => {} };
      ScrollDir = noop;
      return noop;
    }

    const desktopNav = document.querySelector(CONFIG.scrollDir.desktopNavSelector);
    if (!desktopNav) {
      const noop = { pause: () => {}, reset: () => {}, cleanup: () => {} };
      ScrollDir = noop;
      return noop;
    }

    let lastScrollY = window.scrollY || 0;
    let ticking = false;

    // Internal, coherent state
    let isPaused = false;
    let navHidden = false;

    // Best-effort initial state inference (avoid first reset flicker)
    try {
      const yP = Number(gsap.getProperty(desktopNav, "yPercent")) || 0;
      const op = Number(gsap.getProperty(desktopNav, "opacity"));
      navHidden = yP < -1 || (Number.isFinite(op) && op <= 0.01);
    } catch (_) {
      navHidden = false;
    }

    const pause = (state) => {
      isPaused = !!state;
      // Reset baseline so resume cannot create a fake "scroll up".
      lastScrollY = window.scrollY || 0;
    };

    const resetNav = (forceFade = true) => {
      if (!desktopNav) return;

      // Ensure no pending slide tweens survive the transition
      gsap.killTweensOf(desktopNav);

      // 1) Correct position immediately, no slide
      gsap.set(desktopNav, { yPercent: 0 });

      // 2) Opacity handling
      if (CONFIG.scrollDir.animateOpacity === false) {
        gsap.set(desktopNav, { opacity: 1 });
        navHidden = false;
        return;
      }

      if (navHidden && forceFade) {
        gsap.fromTo(
          desktopNav,
          { opacity: 0 },
          {
            opacity: 1,
            duration: CONFIG.scrollDir.transitionFadeDur || 0.28,
            ease: CONFIG.scrollDir.ease,
            overwrite: true,
            onComplete: () => {
              navHidden = false;
            },
          }
        );
      } else {
        gsap.set(desktopNav, { opacity: 1 });
        navHidden = false;
      }
    };

    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: `(min-width: ${CONFIG.scrollDir.desktopMinWidth})`,
        isMobile: `(max-width: calc(${CONFIG.scrollDir.desktopMinWidth} - 0.001px))`,
      },
      (ctx) => {
        const onScroll = () => {
          if (ticking) return;
          ticking = true;

          requestAnimationFrame(() => {
            const y = window.scrollY || 0;

            // Pause guard: keep baseline in sync, no direction updates
            if (isPaused) {
              lastScrollY = y;
              ticking = false;
              return;
            }

            if (Math.abs(y - lastScrollY) < CONFIG.scrollDir.minDelta) {
              ticking = false;
              return;
            }

            const direction = y > lastScrollY ? "down" : "up";
            const started = y > CONFIG.scrollDir.startedY;

            lastScrollY = y;

            if (CONFIG.scrollDir.setBodyAttributes !== false) {
              try {
                document.body.setAttribute("data-scrolling-direction", direction);
                document.body.setAttribute("data-scrolling-started", String(started));
              } catch (_) {}
            }

            // Desktop behavior only
            if (ctx.conditions.isDesktop) {
              // Hide only once when conditions are met
              if (direction === "down" && started && !navHidden) {
                gsap.to(desktopNav, {
                  yPercent: CONFIG.scrollDir.desktopHideYPercent,
                  duration: CONFIG.scrollDir.tweenDur,
                  opacity: CONFIG.scrollDir.animateOpacity === false ? undefined : 0,
                  ease: CONFIG.scrollDir.ease,
                  overwrite: true,
                });
                navHidden = true;
              }

              // Show only when it was hidden
              if (direction === "up" && navHidden) {
                gsap.to(desktopNav, {
                  yPercent: 0,
                  opacity: CONFIG.scrollDir.animateOpacity === false ? undefined : 1,
                  duration: CONFIG.scrollDir.tweenDur,
                  ease: CONFIG.scrollDir.ease,
                  overwrite: true,
                });
                navHidden = false;
              }
            }

            ticking = false;
          });
        };

        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
          try { window.removeEventListener("scroll", onScroll); } catch (_) {}
        };
      }
    );

    const cleanup = () => {
      try { mm.revert(); } catch (_) {}
    };

    const controller = {
      pause,
      reset: resetNav,
      cleanup,
    };

    ScrollDir = controller;
    return controller;
  }


  /* =========================
  BOOTSTRAP (one-time globals)
  ========================= */

  function bootstrapOnce() {
    if (window.__coreBootstrapDone) return;
    window.__coreBootstrapDone = true;

    // 1) Safety first (avoid pipeline breaks)
    bindGlobalSafetyOnce();

    // 2) Click guard (avoid Barba on same-page anchors)
    preventSamePageClicks();

    // 2a) Language switcher (force hard reload on i18n swap)
    try { initLanguageSwitcher(); } catch (_) {}

    // 2b) Console signature (credits, one time)
    initSignature();

    // 2c) Menu (nav is outside Barba container, init once)
    initMenu(document);

    // 2d) Scroll direction (nav hide/show on desktop, global)
    ScrollDir = initDetectScrollingDirection();

    // 2e) Barba integration for scroll-direction (pause during transitions + fade-only restore)
    if (barba && barba.hooks && __scrollDirBarbaHooksBound === false) {
      __scrollDirBarbaHooksBound = true;

      barba.hooks.beforeLeave(() => {
        try { ScrollDir?.pause(true); } catch (_) {}
      });

      // NOTE: ScrollDir reset moved to transitionEnter() for proper sync with hero animation
      // barba.hooks.afterEnter(() => {
      //   requestAnimationFrame(() => {
      //     try { ScrollDir?.reset(true); } catch (_) {}
      //     try { ScrollDir?.pause(false); } catch (_) {}
      //   });
      // });

      // Re-bind language switcher after each Barba swap
      barba.hooks.afterEnter(() => {
        try { initLanguageSwitcher(); } catch (_) {}
      });
    }

    // 2f) Barba timing logs (debug)
    if (barba && barba.hooks && !window.__soBarbaTimingHooksBound) {
      window.__soBarbaTimingHooksBound = true;

      const _t = () => (performance.now ? performance.now().toFixed(1) : String(Date.now()));
      const _logBarba = (label) => {
        if (!CONFIG.debugBarbaTimings) return;
        try { console.log(`[BARBA] ${label}`, _t()); } catch (_) {}
      };

      barba.hooks.before(() => _logBarba("before"));
      barba.hooks.beforeLeave(() => _logBarba("beforeLeave"));
      barba.hooks.leave(() => _logBarba("leave"));
      barba.hooks.afterLeave(() => _logBarba("afterLeave"));
      barba.hooks.beforeEnter(() => _logBarba("beforeEnter"));
      barba.hooks.enter(() => _logBarba("enter"));
      barba.hooks.afterEnter(() => _logBarba("afterEnter"));
      barba.hooks.after(() => _logBarba("after"));
    }

    // 3) Scroll engine (Lenis) + resume handlers
    Scroll.initLenis();
    Scroll.bindResumeHandlersOnce();
    bindWebflowFormsResumeOnce();

    log("Bootstrap OK");
  }

  // Boot once at script evaluation time (earliest possible)
  bootstrapOnce();

  /* =========================
  DOM HELPERS
  ========================= */
  function getAnimatableChildren(el) {
    if (!el) return [];

    let container = el;
    if (el.classList.contains("u-display-contents")) {
      container = el.querySelector(".u-content-wrapper") || el;
    }

    return Array.from(container.children).filter((child) => {
      if (child.classList.contains("w-condition-invisible")) return false;
      if (child.classList.contains("u-embed-css")) return false;
      if (child.classList.contains("w-embed")) return false;
      if (child.tagName === "STYLE") return false;
      return true;
    });
  }

  /* =========================
     STAGGERED CHILDREN HELPER
  ========================= */
  function getStaggerableElements(section) {
    if (!section) return [];

    const elements = Array.from(
      section.querySelectorAll("[data-reveal-children='stagger']")
    );

    // Filtra elementi non validi
    return elements.filter((el) => {
      if (el.classList.contains("w-condition-invisible")) return false;
      if (el.classList.contains("swiper-slide-duplicate")) return false;
      return true;
    });
  }

  function getRealElement(el) {
    if (!el) return null;
    if (el.classList.contains("u-display-contents")) {
      return el.querySelector(".u-content-wrapper") || el;
    }
    return el;
  }

  /* =========================
  STACKING HELPERS, crossfade
  ========================= */
  function setTransitionStack(current, next) {
    if (!current || !next) return;

    const wrapper = current.parentElement;
    if (wrapper && getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    }

    gsap.set(current, { zIndex: 1, willChange: "opacity, transform" });

    gsap.set(next, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      zIndex: 2,
      willChange: "opacity, transform",
    });
  }

  function clearTransitionStack(next) {
    if (!next) return;
    gsap.set(next, { clearProps: "position,top,left,width,zIndex,willChange,transform" });
  }

  /* =========================
  SCROLL FREEZE (anti flash)
  ========================= */
  let __freezeScrollY = 0;

  function freezeCurrentForTransition(current) {
    if (!current) return;

    __freezeScrollY = window.scrollY || window.pageYOffset || 0;

    // evita jump layout quando current diventa fixed
    document.body.style.height = `${document.body.scrollHeight}px`;

    gsap.set(current, {
      position: "fixed",
      top: -__freezeScrollY,
      left: 0,
      width: "100%",
      zIndex: 1,
      willChange: "opacity, transform",
    });
  }

  function unfreezeAfterTransition(current) {
    if (!current) return;

    document.body.style.height = "";

    gsap.set(current, {
      clearProps: "position,top,left,width,zIndex,willChange,transform,opacity",
    });

    window.scrollTo(0, 0);
  }

  /* =========================
  PREPARE PAGE
  ========================= */
  function preparePage(container) {
    if (!container) return;

    const namespace = getNamespace(container);
    gsap.set(container, { autoAlpha: 1 });

    const heroContent = container.querySelector("[data-hero-content]");
    if (heroContent) {
      const children = getAnimatableChildren(heroContent);
      if (children.length) gsap.set(children, { autoAlpha: 0 });
    }

    const heroMedia = container.querySelector("[data-hero-media]");
    if (heroMedia) {
      const realMedia = getRealElement(heroMedia);
      gsap.set(realMedia, { autoAlpha: 0 });
    }

    if (namespace === "apply") {
      const heroSection = container.querySelector("[data-hero]");
      const layout = heroSection?.querySelector(".u-layout-wrapper");
      if (layout) {
        const directChildren = layout.querySelectorAll(
          ".u-text, .u-rich-text, [data-wf--typography-heading--variant], [data-wf--typography-paragraph--variant]"
        );
        gsap.set(directChildren, { autoAlpha: 0 });
      }
    }

    // Sections
    container.querySelectorAll("[data-reveal='section']").forEach((section) => {
      const children = getAnimatableChildren(section);
      if (children.length) {
        gsap.set(children, { autoAlpha: 0 });
      } else {
        const realSection = getRealElement(section);
        gsap.set(realSection, { autoAlpha: 0 });
      }

      // Nascondi elementi staggerabili
      const staggerable = getStaggerableElements(section);
      if (staggerable.length) {
        gsap.set(staggerable, { autoAlpha: 0 });
      }
    });

    // NEW: Dividers
    container.querySelectorAll("[data-reveal='divider']").forEach((divider) => {
      const children = getAnimatableChildren(divider);
      if (children.length) {
        gsap.set(children, { autoAlpha: 0 });
      } else {
        const realDivider = getRealElement(divider);
        gsap.set(realDivider, { autoAlpha: 0 });
      }
    });

    log(`Page prepared: ${namespace}`);
  }

  /* =========================
     DYNAMIC YEAR (footer)
  ========================= */

  function initDynamicYear(scope = document) {
    const root = getRoot(scope);
    root.querySelectorAll("[data-dynamic-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });

    return () => {};
  }

  /* =========================
     SLIDERS (Swiper, per-container)
  ========================= */

  function readBoolAttr(el, name, fallback) {
    if (!el) return !!fallback;
    const v = el.getAttribute(name);
    if (v == null || v === "") return !!fallback;
    return v === "true";
  }

  function readNumAttr(el, name, fallback) {
    if (!el) return Number(fallback || 0);
    const v = el.getAttribute(name);
    const n = Number(v);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function readStrAttr(el, name, fallback) {
    if (!el) return String(fallback || "");
    const v = el.getAttribute(name);
    return v == null ? String(fallback || "") : String(v);
  }

  function getSliderVariant(component) {
    const attr = CONFIG.sliders?.variantAttr || "data-slider-variant";
    const def = CONFIG.sliders?.defaultVariant || "default";
    const v = (component?.getAttribute?.(attr) || "").trim().toLowerCase();
    return v || def;
  }

  function getSliderConfigFor(component) {
    const base = CONFIG.sliders?.defaults || {};
    const variants = CONFIG.sliders?.variants || {};
    const variantName = getSliderVariant(component);
    const variant = variants[variantName] || variants[CONFIG.sliders?.defaultVariant || "default"] || {};

    // Merge order: defaults -> variant
    return {
      name: variantName,
      ...base,
      ...variant,
    };
  }

  function normalizeSliderDom(component, swiperWrapper) {
    // Normalizzazione DOM (Webflow wrappers)
    flattenDisplayContents(swiperWrapper);

    // removeCMSList() exists elsewhere in the file (used in your previous slider code)
    // Keep it optional for safety.
    try {
      if (typeof removeCMSList === "function") removeCMSList(swiperWrapper);
    } catch (_) {}

    // Ensure slides have the correct class
    [...swiperWrapper.children].forEach((el) => el.classList.add("swiper-slide"));

    // CSS hook: slide count (useful for your CSS width formula)
    const slideCount = swiperWrapper.children.length;
    component.style.setProperty("--slide-count", String(Math.max(slideCount, 1)));

    return slideCount;
  }

  /* =========================
     SLIDER CLICK ZONES (optional)
     - Enabled by variant="collection" or attribute data-slider-click-zones
     - Injects two transparent zones (prev/next) over the slider
     - Desktop only by default (pointer: fine)
  ========================= */

  function shouldEnableClickZones(component, variantName) {
    if (!component) return false;
    if (String(variantName || "").toLowerCase() === "collection") return true;
    return component.hasAttribute("data-slider-click-zones");
  }

  function mountSliderClickZones(component, swiperElement, instance) {
    if (!component || !swiperElement || !instance) return () => {};

    // Desktop only (avoid hijacking touch swipe)
    const isFinePointer = !!window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return () => {};

    // Prevent double-mount
    if (component.querySelector("[data-slider-click-zones-wrapper]")) return () => {};

    // Ensure a positioning context
    try {
      const cs = window.getComputedStyle(swiperElement);
      if (cs.position === "static") swiperElement.style.position = "relative";
    } catch (_) {
      // Fallback: still set position
      swiperElement.style.position = "relative";
    }

    const wrap = document.createElement("div");
    wrap.setAttribute("data-slider-click-zones-wrapper", "true");
    wrap.style.position = "absolute";
    wrap.style.inset = "0";
    wrap.style.display = "flex";
    wrap.style.pointerEvents = "none";
    wrap.style.zIndex = "5";

    const left = document.createElement("button");
    left.type = "button";
    left.setAttribute("aria-label", "Previous slide");
    left.setAttribute("data-slider-click-zone", "prev");
    left.style.flex = "1";
    left.style.background = "transparent";
    left.style.border = "0";
    left.style.padding = "0";
    left.style.margin = "0";
    left.style.cursor = "pointer";
    left.style.pointerEvents = "auto";

    const right = document.createElement("button");
    right.type = "button";
    right.setAttribute("aria-label", "Next slide");
    right.setAttribute("data-slider-click-zone", "next");
    right.style.flex = "1";
    right.style.background = "transparent";
    right.style.border = "0";
    right.style.padding = "0";
    right.style.margin = "0";
    right.style.cursor = "pointer";
    right.style.pointerEvents = "auto";

    // Avoid click when user is selecting text or dragging
    const safeSlidePrev = (e) => {
      try { e?.preventDefault?.(); } catch (_) {}
      try { instance.slidePrev(); } catch (_) {}
    };
    const safeSlideNext = (e) => {
      try { e?.preventDefault?.(); } catch (_) {}
      try { instance.slideNext(); } catch (_) {}
    };

    left.addEventListener("click", safeSlidePrev);
    right.addEventListener("click", safeSlideNext);

    wrap.appendChild(left);
    wrap.appendChild(right);

    // Mount on the Swiper element so it overlays slides but stays inside the component
    swiperElement.appendChild(wrap);

    return () => {
      try { left.removeEventListener("click", safeSlidePrev); } catch (_) {}
      try { right.removeEventListener("click", safeSlideNext); } catch (_) {}
      try { wrap.remove(); } catch (_) {}
    };
  }

  function initSliders(scope = document) {
    if (!CONFIG.sliders?.enabled) return () => {};

    const SwiperClass = window.Swiper;
    if (!SwiperClass) {
      log("[SLIDERS] Swiper not found, skip");
      return () => {};
    }

    const root = getRoot(scope);
    const selector = CONFIG.sliders?.componentSelector || "[data-slider]";
    const components = root.querySelectorAll(selector);
    if (!components.length) return () => {};

    const instances = [];

    components.forEach((component) => {
      if (component.dataset.scriptInitialized === "true") return;
      component.dataset.scriptInitialized = "true";

      const swiperElement = component.querySelector(".slider_element");
      const swiperWrapper = component.querySelector(".slider_list");
      if (!swiperElement || !swiperWrapper) return;

      const cfg = getSliderConfigFor(component);

      // DOM normalization (always), then optional behaviors (variant-driven)
      if (cfg.pruneEmptySlides === false) {
        // temporarily bypass pruneEmptySlides by shadowing the function call
        // We still normalize display contents + CMS list.
        flattenDisplayContents(swiperWrapper);
        try {
          if (typeof removeCMSList === "function") removeCMSList(swiperWrapper);
        } catch (_) {}
        [...swiperWrapper.children].forEach((el) => el.classList.add("swiper-slide"));

        const slideCount = swiperWrapper.children.length;
        if (cfg.setCssSlideCount !== false) {
          component.style.setProperty("--slide-count", String(Math.max(slideCount, 1)));
        }

        if (slideCount <= 0) {
          // Nothing to init: avoid Swiper crash (updateSlidesClasses expects at least one slide)
          delete component.dataset.scriptInitialized;
          return;
        }

        // Hide controls if single slide (variant-driven)
        if (cfg.hideControlsIfSingle && slideCount <= 1) {
          const controls = component.querySelector(".slider_controls");
          if (controls) controls.style.display = "none";
          return;
        }
      } else {
        // Optional: prune empty slides (variant-driven)
        if (cfg.pruneEmptySlides) {
          try { pruneEmptySlides(swiperWrapper); } catch (_) {}
        }

        const slideCount = normalizeSliderDom(component, swiperWrapper);

        if (slideCount <= 0) {
          // Nothing to init: avoid Swiper crash (updateSlidesClasses expects at least one slide)
          delete component.dataset.scriptInitialized;
          return;
        }

        // Hide controls if single slide (variant-driven)
        if (cfg.hideControlsIfSingle && slideCount <= 1) {
          const controls = component.querySelector(".slider_controls");
          if (controls) controls.style.display = "none";
          return;
        }
      }

      // Attribute overrides (last layer)
      const followFinger = readBoolAttr(swiperElement, "data-follow-finger", cfg.followFinger);
      const freeMode = readBoolAttr(swiperElement, "data-free-mode", cfg.freeMode);
      const mousewheel = readBoolAttr(swiperElement, "data-mousewheel", cfg.mousewheel);
      const slideToClickedSlide = readBoolAttr(swiperElement, "data-slide-to-clicked", cfg.slideToClickedSlide);
      const speed = readNumAttr(swiperElement, "data-speed", cfg.speed);
      const loop = readBoolAttr(swiperElement, "data-loop", cfg.loop);

      // Swiper loop requires at least 2 slides; force-disable when not possible.
      const effectiveLoop = loop && swiperWrapper.children.length > 1;

      const effectAttr = readStrAttr(swiperElement, "data-effect", "").trim().toLowerCase();
      const effect = effectAttr || (cfg.effect || "");

      const swiperConfig = {
        slidesPerView: cfg.slidesPerView,
        centeredSlides: cfg.centeredSlides,
        autoHeight: cfg.autoHeight,
        speed,

        followFinger,
        freeMode,
        slideToClickedSlide,

        loop: effectiveLoop,
        loopAdditionalSlides: cfg.loopAdditionalSlides,

        mousewheel: {
          enabled: mousewheel,
          forceToAxis: cfg.mousewheelForceToAxis,
        },

        keyboard: {
          enabled: cfg.keyboardEnabled,
          onlyInViewport: cfg.keyboardOnlyInViewport,
        },

        navigation: {
          nextEl: component.querySelector("[data-slider='next'] button"),
          prevEl: component.querySelector("[data-slider='previous'] button"),
        },

        pagination: {
          el: component.querySelector(".slider_bullet_list"),
          bulletActiveClass: "is-active",
          bulletClass: "slider_bullet_item",
          bulletElement: "button",
          clickable: true,
        },

        slideActiveClass: "is-active",
        slideDuplicateActiveClass: "is-active",
      };

      // Effect handling
      if (effect === "fade") {
        swiperConfig.effect = "fade";
        swiperConfig.fadeEffect = { crossFade: !!cfg.fadeCrossFade };
      }

      try {
        const instance = new SwiperClass(swiperElement, swiperConfig);
        component.__swiper = instance;

        // Optional click zones (variant="collection" or data-slider-click-zones)
        if (shouldEnableClickZones(component, cfg.name)) {
          component.__clickZonesCleanup = mountSliderClickZones(component, swiperElement, instance);
        } else {
          component.__clickZonesCleanup = null;
        }

        instances.push(component);

        log(`[SLIDERS] init OK (${cfg.name})`, component);
      } catch (e) {
        console.warn("[SLIDERS] init error:", e);
      }
    });

    // Cleanup per scope
    // NOTE: two-phase cleanup.
    // - "soft": disable interactions immediately (no visual reset)
    // - "hard": destroy Swiper instances (still keep cleanStyles=false)
    // Default (no args) remains HARD to preserve existing behavior.
    return (mode = "hard") => {
      const phase = String(mode || "hard").toLowerCase();
      instances.forEach((component) => {
        const instance = component.__swiper;
        // Remove injected click zones (if any)
        try { component.__clickZonesCleanup?.(); } catch (_) {}
        component.__clickZonesCleanup = null;
        // Always stop reacting to input immediately.
        try { component.style.pointerEvents = "none"; } catch (_) {}
        try {
          const el = component.querySelector(".slider_element");
          if (el) el.style.pointerEvents = "none";
        } catch (_) {}
        if (phase === "soft") {
          // Do NOT destroy: keep current translate/active slide to avoid jump-to-first-slide.
          // Best-effort: disable internal listeners without touching layout.
          try {
            if (instance && typeof instance.disable === "function") instance.disable();
          } catch (_) {}
          try {
            if (instance && typeof instance.detachEvents === "function") instance.detachEvents();
          } catch (_) {}
          try {
            if (instance) {
              instance.allowTouchMove = false;
              instance.enabled = false;
            }
          } catch (_) {}
          return;
        }
        // HARD phase: remove instance (but keep cleanStyles=false to avoid visible snap).
        try {
          // destroy(deleteInstance=true, cleanStyles=false)
          instance?.destroy?.(true, false);
        } catch (_) {}
        component.__swiper = null;
        try { delete component.dataset.scriptInitialized; } catch (_) {}
      });
    };
  }

  /* =========================
     SLIDESHOW (per-container)
  ========================= */

  function getSlideshowDelayOverride(namespace) {
    const ns = String(namespace || "").trim();
    const byNs = CONFIG.slideshow?.byNamespace || {};

    const vNs = Number(byNs[ns]);
    if (Number.isFinite(vNs)) return vNs;

    const vGlobal = Number(CONFIG.slideshow?.delayOverrideSec);
    if (Number.isFinite(vGlobal)) return vGlobal;

    const vDefault = Number(CONFIG.slideshow?.startDelaySec);
    return Number.isFinite(vDefault) ? vDefault : undefined;
  }

  function initSlideshow(scope = document, delayOverrideSec) {
    if (!CONFIG.slideshow?.enabled) return () => {};
    if (!gsap) return () => {};

    const root = getRoot(scope);
    const wraps = root.querySelectorAll(CONFIG.slideshow.wrapperSelector || ".slideshow-wrapper");
    if (!wraps.length) return () => {};

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const cleanups = [];

    wraps.forEach((wrap) => {
      if (wrap.hasAttribute("data-slideshow-initialized")) return;
      wrap.setAttribute("data-slideshow-initialized", "true");

      const visualCol = wrap.querySelector(".u-layout-column-2");
      if (!visualCol) return;

      const stack = visualCol.querySelector(".slideshow_wrap");
      if (!stack) return;

      const frames = Array.from(
        stack.querySelectorAll('.u-image-wrapper[data-wf--visual-image--variant="cover"]')
      );
      if (frames.length < 2) return;

      const HOLD = parseFloat(wrap.getAttribute("data-slideshow-hold")) || 2.5;
      const FADE = parseFloat(wrap.getAttribute("data-slideshow-fade")) || 1.0;

      const START_DELAY =
        Number.isFinite(delayOverrideSec)
          ? delayOverrideSec
          : parseFloat(wrap.getAttribute("data-slideshow-start-delay")) || 3.0;

      gsap.set(stack, { position: "relative" });

      frames.forEach((el, idx) => {
        gsap.set(el, {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          autoAlpha: idx === 0 ? 1 : 0,
          zIndex: idx === 0 ? 2 : 1,
          willChange: "opacity",
        });
      });

      if (reduceMotion) {
        cleanups.push(() => {
          wrap.removeAttribute("data-slideshow-initialized");
        });
        return;
      }

      try { wrap.__slideshowTl?.kill?.(); } catch {}
      try { wrap.__slideshowST?.kill?.(); } catch {}
      try { wrap.__slideshowStartCall?.kill?.(); } catch {}

      const tl = gsap.timeline({
        paused: true,
        repeat: -1,
        defaults: { ease: "none" },
      });

      for (let i = 0; i < frames.length; i++) {
        const current = frames[i];
        const next = frames[(i + 1) % frames.length];

        tl.to({}, { duration: HOLD });
        tl.to(current, { autoAlpha: 0, duration: FADE }, ">");
        tl.to(next, { autoAlpha: 1, duration: FADE }, "<");
        tl.set(current, { zIndex: 1 });
        tl.set(next, { zIndex: 2 });
      }

      wrap.__slideshowTl = tl;

      const start = () => {
        if (!document.documentElement.contains(wrap)) return;

        if (ScrollTrigger) {
          wrap.__slideshowST = ScrollTrigger.create({
            trigger: wrap,
            start: "top bottom",
            end: "bottom top",
            onEnter: () => tl.play(),
            onEnterBack: () => tl.play(),
            onLeave: () => tl.pause(),
            onLeaveBack: () => tl.pause(),
          });

          if (typeof ScrollTrigger.isInViewport === "function" && ScrollTrigger.isInViewport(wrap, 0.1)) {
            tl.play();
          }
        } else {
          tl.play();
        }
      };

      if (gsap && typeof gsap.delayedCall === "function") {
        wrap.__slideshowStartCall = gsap.delayedCall(START_DELAY, start);
      } else {
        const t = setTimeout(start, START_DELAY * 1000);
        wrap.__slideshowStartCall = { kill: () => clearTimeout(t) };
      }

      cleanups.push(() => {
        try { wrap.__slideshowTl?.kill?.(); } catch {}
        try { wrap.__slideshowST?.kill?.(); } catch {}
        try { wrap.__slideshowStartCall?.kill?.(); } catch {}
        wrap.__slideshowTl = null;
        wrap.__slideshowST = null;
        wrap.__slideshowStartCall = null;
        wrap.removeAttribute("data-slideshow-initialized");
      });
    });

    return () => cleanups.forEach((fn) => { try { fn(); } catch {} });
  }

  /* =========================
     ACCORDIONS (per-container)
     - Webflow-safe: no preventDefault, no DOM removals
     - Idempotent init via data-scriptInitialized
     - Deterministic cleanup: removes ONLY our listeners + timelines
  ========================= */

  function initAccordions(scope = document) {
    if (!CONFIG.accordions?.enabled) return () => {};
    if (!gsap) {
      console.warn("[ACCORDION] GSAP non trovato, carica GSAP prima di index.js");
      return () => {};
    }

    const root = getRoot(scope);
    const cfg = CONFIG.accordions;

    const components = root.querySelectorAll(cfg.rootSelector || ".accordion_wrap");
    if (!components.length) return () => {};

    const cleanups = [];

    components.forEach((component, listIndex) => {
      if (component.dataset.scriptInitialized === "true") return;
      component.dataset.scriptInitialized = "true";

      const closePrevious = component.getAttribute("data-close-previous") !== "false";
      const closeOnSecondClick = component.getAttribute("data-close-on-second-click") !== "false";
      const openOnHover = component.getAttribute("data-open-on-hover") === "true";

      const openByDefault =
        component.getAttribute("data-open-by-default") !== null &&
        !Number.isNaN(+component.getAttribute("data-open-by-default"))
          ? +component.getAttribute("data-open-by-default")
          : false;

      const list = component.querySelector(cfg.listSelector || ".accordion_list");
      let previousIndex = null;
      const closeFunctions = [];

      if (list) {
        // DOM normalization (Webflow wrappers)
        try { flattenDisplayContents(list); } catch (_) {}
        try {
          if (typeof removeCMSList === "function") removeCMSList(list);
        } catch (_) {}
      }

      const cards = component.querySelectorAll(cfg.itemSelector || ".accordion_component");
      if (!cards.length) {
        cleanups.push(() => {
          try { delete component.dataset.scriptInitialized; } catch (_) {}
        });
        return;
      }

      cards.forEach((card, cardIndex) => {
        const button = card.querySelector(cfg.buttonSelector || ".accordion_toggle_button");
        const content = card.querySelector(cfg.contentSelector || ".accordion_content_wrap");

        if (!button || !content) {
          console.warn("[ACCORDION] Elementi mancanti:", card);
          return;
        }

        // Accessibility
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("id", `accordion_button_${listIndex}_${cardIndex}`);
        content.setAttribute("id", `accordion_content_${listIndex}_${cardIndex}`);
        button.setAttribute("aria-controls", content.id);
        content.setAttribute("aria-labelledby", button.id);

        // Initial state
        content.style.display = "none";

        const refresh = () => {
          try {
            if (ScrollTrigger) ScrollTrigger.refresh();
          } catch (_) {}
        };

        // --- Begin replaced timeline block ---
        const icon = button.querySelector(cfg.iconSelector || ".accordion_icon, [data-accordion-icon]") || null;

        const tl = gsap.timeline({
          paused: true,
          defaults: { duration: cfg.duration || 0.3, ease: cfg.ease || "power2.inOut" },
        });

        // Open: height + subtle fade + micro lift (simple, elegant)
        tl.set(content, {
          display: "block",
          overflow: "hidden",
          willChange: "height, opacity, transform",
        });

        const openFrom = { height: 0 };
        const openTo = { height: "auto" };

        if (cfg.animateOpacity !== false) {
          openFrom.autoAlpha = 0;
          openTo.autoAlpha = 1;
        }

        const y0 = Number(cfg.openYOffset || 0);
        if (y0) {
          openFrom.y = y0;
          openTo.y = 0;
        }

        tl.fromTo(content, openFrom, openTo, 0);

        // Optional icon rotation (if present)
        if (icon) {
          tl.to(icon, { rotate: 180, duration: (cfg.duration || 0.3) * 0.9, ease: cfg.ease || "power2.inOut" }, 0);
        }

        // Finalize open
        tl.add(() => {
          try { content.style.overflow = ""; } catch (_) {}
          try { content.style.willChange = ""; } catch (_) {}
          try { if (ScrollTrigger) ScrollTrigger.refresh(); } catch (_) {}
        });

        // Finalize close
        tl.eventCallback("onReverseComplete", () => {
          try { content.style.display = "none"; } catch (_) {}
          try { content.style.overflow = ""; } catch (_) {}
          try { content.style.willChange = ""; } catch (_) {}
          try { gsap.set(content, { clearProps: "height,opacity,transform" }); } catch (_) {}
          try { if (icon) gsap.set(icon, { rotate: 0, clearProps: "transform" }); } catch (_) {}
          refresh();
        });

        tl.eventCallback("onComplete", () => {
          refresh();
        });
        // --- End replaced timeline block ---

        const closeAccordion = () => {
          if (!card.classList.contains(cfg.activeClass || "is-active")) return;
          card.classList.remove(cfg.activeClass || "is-active");
          try { tl.reverse(); } catch (_) {}
          button.setAttribute("aria-expanded", "false");
        };

        const openAccordion = (instant = false) => {
          if (closePrevious && previousIndex !== null && previousIndex !== cardIndex) {
            closeFunctions[previousIndex]?.();
          }
          previousIndex = cardIndex;
          button.setAttribute("aria-expanded", "true");
          card.classList.add(cfg.activeClass || "is-active");
          try { instant ? tl.progress(1) : tl.play(); } catch (_) {}
        };

        closeFunctions[cardIndex] = closeAccordion;

        // Default open (1-based index from attribute)
        if (openByDefault === cardIndex + 1) openAccordion(true);

        // Handlers (stored for cleanup)
        const onClick = () => {
          const isActive = card.classList.contains(cfg.activeClass || "is-active");
          if (isActive && closeOnSecondClick) {
            closeAccordion();
            previousIndex = null;
          } else {
            openAccordion();
          }
        };

        const onEnter = () => openAccordion();

        button.addEventListener("click", onClick);
        if (openOnHover) button.addEventListener("mouseenter", onEnter);

        cleanups.push(() => {
          try { button.removeEventListener("click", onClick); } catch (_) {}
          try { button.removeEventListener("mouseenter", onEnter); } catch (_) {}
          try { tl.kill(); } catch (_) {}
          try {
            // Reset minimal state (keep DOM intact)
            try { if (icon) gsap.set(icon, { rotate: 0, clearProps: "transform" }); } catch (_) {}
            button.setAttribute("aria-expanded", "false");
            card.classList.remove(cfg.activeClass || "is-active");
            content.style.display = "none";
            content.style.height = "";
          } catch (_) {}
        });
      });

      cleanups.push(() => {
        try { delete component.dataset.scriptInitialized; } catch (_) {}
      });
    });

    return () => cleanups.forEach((fn) => { try { fn(); } catch (_) {} });
  }

  /* =========================
  CLASSIFY REVEALS (section + divider)
  ========================= */
  function classifyReveals(container) {
    const reveals = Array.from(
      container.querySelectorAll("[data-reveal='section'], [data-reveal='divider']")
    );

    const threshold = window.innerHeight * CONFIG.viewport.aboveThreshold;

    const above = [];
    const below = [];

    reveals.forEach((el) => {
      const rect = el.getBoundingClientRect();
      (rect.top < threshold ? above : below).push(el);
    });

    log(`Reveals: ${above.length} above, ${below.length} below`);
    return { above, below };
  }

  function getRevealType(el) {
    return el?.getAttribute("data-reveal") || "unknown";
  }

  /* =========================
  ANIMATE HERO
  ========================= */
  function animateHero(container) {
    const namespace = getNamespace(container);
    const config = getHeroConfig(namespace);

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onStart: () => log(`Hero START: ${namespace}`),
      onComplete: () => log(`Hero COMPLETE: ${namespace}`),
    });

    const heroContent = container.querySelector("[data-hero-content]");
    const heroMedia = container.querySelector("[data-hero-media]");

    // Fallback content detection for pages like "apply" (no data-hero-content)
    let applyTextElements = null;
    if (namespace === "apply" && !heroContent) {
      const heroSection = container.querySelector("[data-hero]");
      applyTextElements = heroSection?.querySelectorAll(
        ".u-layout-column-1 .u-text, .u-layout-column-1 .u-rich-text"
      );
    }

    const hasMedia = !!(heroMedia && config.mediaDuration > 0);
    const mediaDelay = Number(config.mediaDelay || 0);
    const mediaDuration = Number(config.mediaDuration || 0);
    const mediaToContentGap = Number(config.mediaToContentGap || 0);

    // If there is nothing to animate (no content, no media), keep labels deterministic at 0
    const contentChildren = heroContent ? getAnimatableChildren(heroContent) : [];
    const hasContent = (contentChildren && contentChildren.length > 0) || (applyTextElements && applyTextElements.length > 0);

    if (!hasContent && !hasMedia) {
      log(`Hero SKIP (no content/media): ${namespace}`);
      tl.addLabel("hero:contentStart", 0);
      tl.addLabel("hero:done", 0);
      return tl;
    }

    // Quando richiesto (es. home): prima media, poi content
    if (hasMedia && config.mediaFirst === true) {
      const realMedia = getRealElement(heroMedia);
      const contentAt = Math.max(0, mediaDelay + mediaDuration + mediaToContentGap);

      tl.to(realMedia, { autoAlpha: 1, duration: mediaDuration }, mediaDelay);

      // Label: inizio contenuti hero (dopo media + gap)
      tl.addLabel("hero:contentStart", contentAt);

      if (heroContent) {
        const children = getAnimatableChildren(heroContent);
        if (children.length) {
          tl.to(children, { autoAlpha: 1, duration: config.duration, stagger: config.stagger }, contentAt);
        }
      } else if (namespace === "apply") {
        const textElements = applyTextElements;
        if (textElements?.length) {
          tl.to(textElements, { autoAlpha: 1, duration: config.duration, stagger: config.stagger }, contentAt);
        }
      }

      // Label: fine hero (completa)
      tl.addLabel("hero:done");
      return tl;
    }

    // Default: prima content, poi media (come prima)
    if (heroContent) {
      const children = getAnimatableChildren(heroContent);
      if (children.length) {
        tl.to(children, { autoAlpha: 1, duration: config.duration, stagger: config.stagger }, 0);
      }
    }

    if (namespace === "apply" && !heroContent) {
      const textElements = applyTextElements;
      if (textElements?.length) {
        tl.to(textElements, { autoAlpha: 1, duration: config.duration, stagger: config.stagger }, 0);
      }
    }

    // Label: inizio contenuti hero (default)
    tl.addLabel("hero:contentStart", 0);

    if (hasMedia) {
      const realMedia = getRealElement(heroMedia);
      tl.to(realMedia, { autoAlpha: 1, duration: mediaDuration }, mediaDelay);
    }

    // Label: fine hero (completa)
    tl.addLabel("hero:done");
    return tl;
  }

  /* =========================
  ANIMATE SECTION
  ========================= */
  function animateSection(section) {
    const children = getAnimatableChildren(section);
    const staggerable = getStaggerableElements(section);
    const minCount = CONFIG.revealChildren?.minCount || 2;

    // Se abbiamo abbastanza elementi staggerabili
    if (staggerable.length >= minCount) {
      const tl = gsap.timeline();

      // Anima i children normali (esclusi quelli staggerabili)
      const normalChildren = children.filter(
        (child) => !child.hasAttribute("data-reveal-children")
      );

      if (normalChildren.length) {
        tl.to(normalChildren, {
          autoAlpha: 1,
          duration: CONFIG.sections.duration,
          stagger: CONFIG.sections.childStagger,
          ease: CONFIG.sections.ease,
        }, 0);
      }

      // Stagger degli elementi marcati (usa config dedicata)
      const revealDelay = CONFIG.revealChildren.delay || 0;
      tl.to(staggerable, {
        autoAlpha: 1,
        duration: CONFIG.revealChildren.duration,
        stagger: CONFIG.revealChildren.stagger,
        ease: CONFIG.revealChildren.ease,
      }, revealDelay);

      return tl;
    }

    // Comportamento standard
    if (children.length) {
      return gsap.to(children, {
        autoAlpha: 1,
        duration: CONFIG.sections.duration,
        stagger: CONFIG.sections.childStagger,
        ease: CONFIG.sections.ease,
      });
    }

    const realSection = getRealElement(section);
    return gsap.to(realSection, {
      autoAlpha: 1,
      duration: CONFIG.sections.duration,
      ease: CONFIG.sections.ease,
    });
  }

  /* =========================
  ANIMATE DIVIDER
  ========================= */
  function animateDivider(divider) {
    const children = getAnimatableChildren(divider);

    if (children.length) {
      return gsap.to(children, {
        autoAlpha: 1,
        duration: CONFIG.dividers.duration,
        stagger: CONFIG.dividers.childStagger,
        ease: CONFIG.dividers.ease,
      });
    }

    const realDivider = getRealElement(divider);
    return gsap.to(realDivider, {
      autoAlpha: 1,
      duration: CONFIG.dividers.duration,
      ease: CONFIG.dividers.ease,
    });
  }

  /* =========================
  REVEAL DISPATCHER (section + divider)
  ========================= */
  function animateReveal(el) {
    const type = getRevealType(el);
    if (type === "divider") return animateDivider(el);
    return animateSection(el);
  }

  function getAboveStaggerFor(el) {
    const type = getRevealType(el);
    return type === "divider" ? CONFIG.dividers.stagger : CONFIG.sections.stagger;
  }

  function animateRevealsAbove(reveals) {
    if (!reveals.length) return gsap.timeline();
    const tl = gsap.timeline();

    let cursor = 0;
    reveals.forEach((el) => {
      tl.add(() => animateReveal(el), cursor);
      cursor += getAboveStaggerFor(el);
    });

    return tl;
  }

  function setupBelowFold(reveals) {
    if (!ScrollTrigger || !reveals.length) return [];
    return reveals.map((el) => {
      const type = getRevealType(el);
      const start = type === "divider" ? CONFIG.dividers.triggerStart : CONFIG.sections.triggerStart;

      return ScrollTrigger.create({
        trigger: el,
        start,
        once: true,
        onEnter: () => animateReveal(el),
      });
    });
  }

  function createRevealSequence(container) {
    const { above, below } = classifyReveals(container);

    const master = gsap.timeline();

    // Hero timeline (la durata puo variare per namespace, es. mediaFirst)
    const heroTL = animateHero(container);
    master.add(heroTL, 0);

    // Fallback: if heroTL is effectively empty (no content/media), reveal above-the-fold immediately.
    const heroDur = typeof heroTL.totalDuration === "function" ? heroTL.totalDuration() : heroTL.duration();
    if (!heroDur || heroDur <= 0.001) {
      master.add(animateRevealsAbove(above), 0);
      const triggers = setupBelowFold(below);

      return {
        timeline: master,
        triggers,
        cleanup: () => {
          master.kill();
          triggers.forEach((t) => t.kill());
        },
      };
    }

    // Per-namespace control (se presente): anchor + offset rispetto alle label della hero.
    // Fallback: usa il comportamento globale (gap relativo alla fine hero).
    const namespace = getNamespace(container);
    const heroCfg = getHeroConfig(namespace);

    let anchor = String(heroCfg.revealAnchor || "").trim();
    const offsetRaw = heroCfg.revealOffset;
    const offset = Number(offsetRaw);

    // Safety: if revealOffset is provided but revealAnchor is missing, default to "done"
    if (!anchor && offsetRaw != null && !Number.isNaN(offset)) {
      anchor = "done";
    }

    if (anchor) {
      const baseLabel = anchor === "contentStart" ? "hero:contentStart" : "hero:done";
      const abs = Math.abs(Number.isNaN(offset) ? 0 : offset);
      const pos = Number.isNaN(offset) || offset === 0
        ? baseLabel
        : offset > 0
          ? `${baseLabel}+=${abs}`
          : `${baseLabel}-=${abs}`;

      master.add(animateRevealsAbove(above), pos);
    } else {
      const heroGap = Number(CONFIG.overlap.heroToSections || 0);
      const revealPos =
        heroGap === 0
          ? ">"
          : heroGap > 0
            ? `>+=${heroGap}`
            : `>-= ${Math.abs(heroGap)}`.replace(" ", "");
      master.add(animateRevealsAbove(above), revealPos);
    }

    const triggers = setupBelowFold(below);

    return {
      timeline: master,
      triggers,
      cleanup: () => {
        master.kill();
        triggers.forEach((t) => t.kill());
      },
    };
  }

  /* =========================
  LOADER
  ========================= */
  let loaderDone = false;

  async function runLoader(onHeroStart) {
    if (loaderDone) {
      onHeroStart?.();
      return;
    }
    loaderDone = true;

    const loader = document.querySelector(".loader_wrap");
    if (!loader) {
      document.documentElement.classList.remove("is-loading");
      onHeroStart?.();
      return;
    }

    const paths = loader.querySelectorAll("svg path");
    const contain = loader.querySelector(".loader_contain");
    const text = loader.querySelector(".loader_layout .u-text");

    scrollLock();

    // Mostra wrapper (backdrop) subito
    gsap.set(loader, { autoAlpha: 1, display: "flex" });

    // Stato iniziale deterministico + anti-flicker: i contenuti possono essere nascosti via CSS
    // (es. html.is-loading .loader_contain[data-prevent-flicker="true"]) e li sblocchiamo appena parte la timeline.
    if (contain) gsap.set(contain, { autoAlpha: 0, force3D: true, willChange: "opacity, visibility" });
    if (paths.length) gsap.set(paths, { autoAlpha: 0 });
    if (text) gsap.set(text, { autoAlpha: 0 });

    const start = performance.now();

    const tlIn = gsap.timeline({ defaults: { ease: "power2.out" } });

    // Sblocca la visibilita dei contenuti del loader (se nascosti via CSS con data-prevent-flicker)
    if (contain) tlIn.set(contain, { autoAlpha: 1 }, 0);

    if (paths.length) {
      tlIn.to(paths, { autoAlpha: 1, duration: CONFIG.loader.fadeInDuration, stagger: 0.05 }, 0.2);
    }

    // Testo / claim (entra dopo il logo, sobrio)
    if (text) {
      tlIn.to(
        text,
        { autoAlpha: 1, duration: Math.max(0.6, CONFIG.loader.fadeInDuration * 0.75) },
        1.5
      );
    }

    await tlIn;

    const elapsed = performance.now() - start;
    const wait = CONFIG.loader.minDuration - elapsed;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    const tlOut = gsap.timeline({ defaults: { ease: CONFIG.loader.ease } });

    // Uscita ordinata: contenuti (logo + testo) insieme con leggero shift Y, poi wrapper
    if (contain) tlOut.to(contain, { autoAlpha: 0, y: -8, duration: CONFIG.loader.fadeOutDuration, force3D: true, clearProps: "transform" }, 0);

    tlOut.to(loader, { autoAlpha: 0, duration: CONFIG.loader.fadeOutDuration }, 0.1);

    const heroAt = Math.max(0, CONFIG.loader.fadeOutDuration + CONFIG.overlap.loaderToHero);
    tlOut.call(() => onHeroStart?.(), null, heroAt);

    await tlOut;

    if (contain) gsap.set(contain, { clearProps: "all" });
    gsap.set(loader, { display: "none" });
    document.documentElement.classList.remove("is-loading");
    scrollUnlock();
  }

  /* =========================
     BARBA NAV UPDATE
  ========================= */

  function initBarbaNavUpdate(data) {
    if (!data?.next?.html) return;

    const $ = window.jQuery || window.$;
    if (!$) return;

    const $next = $(data.next.html).find('[data-barba-update="nav"]');
    if (!$next.length) return;

    $('[data-barba-update="nav"]').each(function (index) {
      const $source = $($next[index]);
      if (!$source.length) return;

      const ariaCurrent = $source.attr("aria-current");
      if (ariaCurrent !== undefined) $(this).attr("aria-current", ariaCurrent);
      else $(this).removeAttr("aria-current");

      const className = $source.attr("class");
      if (className !== undefined) $(this).attr("class", className);
    });
  }

  /* =========================
  TRANSITIONS, crossfade sync
  ========================= */
  function transitionLeave(data) {
    const current = data?.current?.container;
    const next = data?.next?.container;

    // SLIDERS: soft cleanup on leave to avoid snap back to first slide during crossfade
    try {
      if (current && typeof current.__slidersCleanup === "function") {
        current.__slidersCleanup("soft");
      }
    } catch (_) {}

    log("Leave: freeze current + hard scrollTop invisibile + crossfade out");

    scrollLock();
    freezeCurrentForTransition(current);
    hardScrollTop();
    setTransitionStack(current, next);

    return gsap.to(current, {
      autoAlpha: 0,
      y: CONFIG.transition.leaveLiftY,
      duration: CONFIG.transition.leaveDuration,
      ease: CONFIG.transition.ease,
      clearProps: "transform",
    });
  }

  function transitionEnter(data, onHeroStart) {
    const current = data?.current?.container;
    const next = data?.next?.container;

    preparePage(next);
    gsap.set(next, { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    tl.to(next, { autoAlpha: 1, duration: CONFIG.transition.enterDuration }, CONFIG.transition.enterDelay);

    const heroAt = Math.max(0, CONFIG.transition.enterDelay + CONFIG.overlap.transitionToHero);
    tl.call(() => {
      // Reset nav BEFORE hero starts: pause, reset, resume
      // This ensures nav is in final position and fade (if visible) runs in parallel with hero
      try { ScrollDir?.pause(true); } catch (_) {}
      try { ScrollDir?.reset(true); } catch (_) {}
      try { ScrollDir?.pause(false); } catch (_) {}
      
      // Now hero can start
      onHeroStart?.();
    }, null, heroAt);

    // CLEANUP DETERMINISTICO
    tl.call(() => {
      clearTransitionStack(next);
      unfreezeAfterTransition(current);

      if (ScrollTrigger) {
        requestAnimationFrame(() => ScrollTrigger.refresh(true));
      }

      scrollUnlock();
      log("Enter: cleanup done");
    });

    return tl;
  }

  /* =========================
  BARBA
  ========================= */
  let currentReveal = null;
  let currentSlidersCleanup = null;
  let currentSlideshowCleanup = null;
  let currentAccordionsCleanup = null;
  let currentFormSuccessCleanup = null;

  barba.init({
    preventRunning: true,
    debug: CONFIG.debug,

    transitions: [
      {
        name: "soprano-fade",
        sync: true,

        async once(data) {
          const namespace = getNamespace(data.next.container);
          log(`=== ONCE: ${namespace} ===`);

          hardScrollTop();
          preparePage(data.next.container);
          reinitWebflowForms();
          initDynamicYear(data.next.container);
          currentSlidersCleanup?.();
          currentSlidersCleanup = initSliders(data.next.container);
          data.next.container.__slidersCleanup = currentSlidersCleanup;
          currentSlideshowCleanup?.();
          currentSlideshowCleanup = initSlideshow(
            data.next.container,
            getSlideshowDelayOverride(namespace)
          );
          currentAccordionsCleanup?.();
          currentAccordionsCleanup = initAccordions(data.next.container);
          currentFormSuccessCleanup?.();
          currentFormSuccessCleanup = initFormSuccess(data.next.container);

          await runLoader(() => {
            currentReveal = createRevealSequence(data.next.container);
          });

          if (ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh(true));
        },

        leave(data) {
          const namespace = getNamespace(data.current.container);
          log(`=== LEAVE: ${namespace} ===`);

          currentReveal?.cleanup();
          currentReveal = null;
          // SLIDERS: soft cleanup only (hard cleanup happens in afterLeave hook)
          currentSlidersCleanup?.("soft");
          currentSlidersCleanup = null;
          currentSlideshowCleanup?.();
          currentSlideshowCleanup = null;
          currentAccordionsCleanup?.();
          currentAccordionsCleanup = null;
          currentFormSuccessCleanup?.();
          currentFormSuccessCleanup = null;

          killAllScrollTriggers();

          return transitionLeave(data);
        },

        enter(data) {
          const namespace = getNamespace(data.next.container);
          log(`=== ENTER: ${namespace} ===`);

          // Update nav active state from next HTML before animating in
          initBarbaNavUpdate(data);
          reinitWebflowForms();

          // Update dynamic year inside the next container (footer)
          initDynamicYear(data.next.container);
          currentSlidersCleanup?.();
          currentSlidersCleanup = initSliders(data.next.container);
          data.next.container.__slidersCleanup = currentSlidersCleanup;
          currentSlideshowCleanup?.();
          currentSlideshowCleanup = initSlideshow(
            data.next.container,
            getSlideshowDelayOverride(namespace)
          );
          currentAccordionsCleanup?.();
          currentAccordionsCleanup = initAccordions(data.next.container);
          currentFormSuccessCleanup?.();
          currentFormSuccessCleanup = initFormSuccess(data.next.container);

          return transitionEnter(data, () => {
            currentReveal = createRevealSequence(data.next.container);
          });
        },
      },
    ],
  });

  // SLIDERS: hard cleanup after leave (container is gone / invisible)
  try {
    if (barba?.hooks?.afterLeave) {
      barba.hooks.afterLeave((data) => {
        const current = data?.current?.container;
        try {
          if (current && typeof current.__slidersCleanup === "function") {
            current.__slidersCleanup("hard");
          }
        } catch (_) {}
      });
    }
  } catch (_) {}

})();