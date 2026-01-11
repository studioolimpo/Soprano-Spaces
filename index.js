document.documentElement.classList.add("is-loading");
let __loaderDone = false;
/***********************
 * Dipendenze attese: GSAP, ScrollTrigger (opzionale), Lenis, Swiper, Barba
 ***********************/

(function bootstrap() {
  if (typeof gsap === "undefined") {
    console.warn("[BOOT] GSAP non trovato, carica GSAP prima di index.js");
    return;
  }
  if (typeof barba === "undefined") {
    console.warn("[BOOT] Barba non trovato, carica Barba prima di index.js");
    return;
  }
})();

/* =====================
   UTILS
===================== */

function isElement(v) {
  return v instanceof Element;
}

function getRoot(scope) {
  return isElement(scope) ? scope : document;
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

function removeCMSList(slot) {
  if (!slot) return;

  const dynList = Array.from(slot.children).find((child) => child.classList.contains("w-dyn-list"));
  if (!dynList) return;

  const nestedItems = dynList?.querySelector(".w-dyn-items")?.children;
  if (!nestedItems) return;

  const staticWrapper = [...slot.children];

  [...nestedItems].forEach((el) => {
    const c = [...el.children].find((c) => !c.classList.contains("w-condition-invisible"));
    if (c) slot.appendChild(c);
  });

  staticWrapper.forEach((el) => el.remove());
}

function pruneEmptySlides(wrapper) {
  if (!wrapper) return;
  const PLACEHOLDER_RE = /\/plugins\/Basic\/assets\/placeholder\./i;

  [...wrapper.children].forEach((slide) => {
    if (slide.classList.contains("w-condition-invisible")) {
      slide.remove();
      return;
    }

    const img = slide.querySelector("img");
    const src = img?.getAttribute("src") || "";

    if (img && PLACEHOLDER_RE.test(src)) {
      slide.remove();
      return;
    }

    if (img && (!src || src === "#" || src === "about:blank")) {
      slide.remove();
      return;
    }
  });
}

/* ==========================================================================
   LOADER – EXIT MANAGEMENT
   ========================================================================== */

function hideLoader(delay = 0) {
  const loader = document.querySelector(".loader_wrap");
  if (!loader) return;

  if (loader.__isExiting) return;
  loader.__isExiting = true;

  const EXIT_DURATION = 800;

  // Avvia animazione di uscita
  setTimeout(() => {
    loader.classList.add("is-exiting");
  }, delay);

  // Fine loader
  setTimeout(() => {
    loader.remove();

    // 🔑 sblocca le animazioni del sito
    document.documentElement.classList.remove("is-loading");

    __loaderDone = true;
    document.dispatchEvent(new CustomEvent("loader:done"));
  }, delay + EXIT_DURATION);
}

/* =====================
   LENIS
===================== */

let lenis = null;
let _lenisRaf = null;

function destroyLenis() {
  if (!lenis) return;

  try {
    if (typeof ScrollTrigger !== "undefined") {
      lenis.off("scroll", ScrollTrigger.update);
    }
  } catch {}

  if (_lenisRaf) {
    gsap.ticker.remove(_lenisRaf);
    _lenisRaf = null;
  }

  try {
    lenis.destroy();
  } catch {}

  lenis = null;
  window.lenis = null;
}

function initLenis() {
  if (lenis) return;

  if (typeof Lenis === "undefined") {
    console.warn("[LENIS] Lenis non trovato, carica la libreria prima di index.js");
    return;
  }

  if (typeof gsap === "undefined") {
    console.warn("[LENIS] GSAP non trovato, carica GSAP prima di index.js");
    return;
  }

  // Preset selezionabile da Webflow: <html data-lenis-preset="luxury">
  const preset = (document.documentElement.getAttribute("data-lenis-preset") || "").toLowerCase();
  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;

  // Desktop: più inerzia. Touch: più controllato.
  const duration = !isCoarsePointer && preset === "luxury" ? 1.9 : 1.25;
  const lerp = !isCoarsePointer && preset === "luxury" ? 0.075 : 0.1;
  const wheelMultiplier = !isCoarsePointer && preset === "luxury" ? 0.85 : 1;

  lenis = new Lenis({
    smoothWheel: true,
    smoothTouch: false,
    gestureOrientation: "vertical",
    wheelMultiplier,
    touchMultiplier: 1,
    duration,
    lerp,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  window.lenis = lenis;

  if (typeof ScrollTrigger !== "undefined") {
    try {
      lenis.on("scroll", ScrollTrigger.update);
    } catch {}
  }

  _lenisRaf = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(_lenisRaf);
  gsap.ticker.lagSmoothing(0);
}

function refreshAfterEnter(delay = 0.05) {
  if (typeof gsap === "undefined") return;

  gsap.delayedCall(delay, () => {
    try {
      window.lenis?.raf(performance.now());
    } catch {}

    try {
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh(true);
    } catch {}
  });
}

function forceNextPageToTop() {
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch {}

  const reset = () => {
    try {
      window.lenis?.scrollTo?.(0, { immediate: true });
    } catch {}

    try {
      window.scrollTo(0, 0);
    } catch {}

    try {
      document.documentElement.scrollTop = 0;
    } catch {}

    try {
      document.body.scrollTop = 0;
    } catch {}
  };

  reset();
  requestAnimationFrame(reset);
  // doppio pass per layout async
  setTimeout(reset, 0);
  setTimeout(reset, 50);
}

function lockScroll() {
  // blocca lo scroll nativo (Lenis lo gestisce quando attivo)
  document.documentElement.classList.add("is-scroll-locked");
  document.documentElement.style.overflow = "hidden";
}

function unlockScroll() {
  document.documentElement.classList.remove("is-scroll-locked");
  document.documentElement.style.overflow = "";
}

function pauseLenis() {
  try {
    window.lenis?.stop?.();
  } catch {}
}

function resumeLenis() {
  try {
    window.lenis?.start?.();
  } catch {}
}

// SAME PAGE CLICK
function preventSamePageClicks() {
  if (window.__samePageGuardBound) return;
  window.__samePageGuardBound = true;

  const normPath = (path) =>
    path
      .replace(/\/index\.html?$/i, "")
      .replace(/\/+$/g, "") || "/";

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;

      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
      if (a.target === "_blank" || a.hasAttribute("download") || a.rel === "external") return;
      if (a.dataset.allowSame === "true") return;

      let dest;
      try {
        dest = new URL(a.getAttribute("href"), location.href);
      } catch {
        return;
      }

      if (dest.origin !== location.origin) return;

      const curPath = normPath(location.pathname);
      const destPath = normPath(dest.pathname);
      const sameBase = destPath === curPath && dest.search === location.search;

      if (!sameBase) return;

      // Anchor sulla stessa pagina
      if (dest.hash) {
        const targetEl =
          document.getElementById(dest.hash.slice(1)) || document.querySelector(dest.hash);

        if (targetEl) {
          e.preventDefault();
          if (window.lenis && typeof window.lenis.scrollTo === "function") {
            window.lenis.scrollTo(targetEl, { offset: 0 });
          } else {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        return;
      }

      // Click sulla stessa pagina senza hash
      e.preventDefault();
      if (window.lenis && typeof window.lenis.scrollTo === "function") {
        window.lenis.scrollTo(0);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    true
  );
}
// FOOTER YEAR
function initDynamicYear(scope = document) {
  const root = getRoot(scope);
  root.querySelectorAll("[data-dynamic-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

function CssRetriggerAnimationsOnScroll(scope = document) {
  if (!__loaderDone) {
    document.addEventListener(
      "loader:done",
      () => CssRetriggerAnimationsOnScroll(scope),
      { once: true }
    );
    return;
  }
  const root = getRoot(scope);
  const targets = root.querySelectorAll("[data-css-scroll]");
  if (!targets.length) return;

  // Evita doppia inizializzazione sullo stesso scope (utile con Barba)
  if (root.__cssScrollInit === true) return;
  root.__cssScrollInit = true;

  const thresholdGroups = new Map();

  targets.forEach((el) => {
    const thresholdStr = el.dataset.cssScrollThreshold || "50%";
    const threshold = parseFloat(thresholdStr) / 100;
    if (!thresholdGroups.has(threshold)) thresholdGroups.set(threshold, []);
    thresholdGroups.get(threshold).push(el);
  });

  const entryObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !entry.target.__pastThreshold && entry.target.__ioInit) {
          entry.target.classList.add("animation-ready");
          entryObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0, rootMargin: "-1px" }
  );

  const exitObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const mode = el.dataset.cssScroll || "";
        if (!entry.isIntersecting && mode !== "retrigger-none" && el.__ioInit) {
          const isExitingTop = entry.boundingClientRect.bottom < entry.rootBounds.top;
          if (mode === "retrigger-both" || !isExitingTop) el.classList.add("animation-ready");
        }
      }
    },
    { threshold: 0, rootMargin: "-1px" }
  );

  const ios = [];

  thresholdGroups.forEach((elements, threshold) => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          const mode = el.dataset.cssScroll || "";

          if (!el.__ioInit) {
            el.__ioInit = true;
            if (entry.isIntersecting) {
              el.__cssAnimTriggered = true;
              el.__pastThreshold = true;
            }
            continue;
          }

          if (!entry.isIntersecting) {
            if (mode !== "retrigger-none") el.__cssAnimTriggered = false;
            continue;
          }

          const isScrollingDown =
            entry.boundingClientRect.top >= 0 && entry.boundingClientRect.top < entry.rootBounds.bottom;

          const shouldTrigger =
            mode === "retrigger-none"
              ? !el.__cssAnimTriggered
              : mode === "retrigger-both"
              ? !el.__cssAnimTriggered
              : !el.__cssAnimTriggered && isScrollingDown;

          if (!shouldTrigger) continue;

          el.__cssAnimTriggered = true;
          if (!el.classList.contains("animation-ready")) continue;

          const delayMs = Number(el.dataset.cssScrollDelay || 0);

          // evita doppi timeout se l’utente scrolla avanti e indietro velocemente
          if (el.__cssDelayTimer) {
            clearTimeout(el.__cssDelayTimer);
            el.__cssDelayTimer = null;
          }

          el.__cssDelayTimer = setTimeout(() => {
            el.__cssDelayTimer = null;

            // se nel frattempo è uscito dalla viewport, non far partire nulla
            // (evita animazioni “fantasma”)
            if (!el.isConnected) return;

            el.classList.remove("animation-ready");
            el.classList.add("reset-animations");
            el.offsetHeight;

            requestAnimationFrame(() => {
              el.classList.remove("reset-animations");
              if (mode === "retrigger-none") io.unobserve(el);
            });
          }, delayMs);
        }
      },
      { threshold }
    );

    ios.push(io);

    elements.forEach((el) => {
      io.observe(el);
      entryObserver.observe(el);
      exitObserver.observe(el);
    });
  });

  // Cleanup agganciato allo scope (container Barba)
  root.__cssScrollCleanup = () => {
    try {
      entryObserver.disconnect();
      exitObserver.disconnect();
      ios.forEach((o) => o.disconnect());
    } catch {}

    try {
      delete root.__cssScrollCleanup;
      delete root.__cssScrollInit;
    } catch {}
  };
}

function destroyCssRetriggerAnimationsOnScroll(scope = document) {
  const root = getRoot(scope);
  try {
    root.__cssScrollCleanup?.();
  } catch {}
}

/* =====================
   SWIPER
===================== */

function initSwiperSliders(scope = document) {
  if (typeof Swiper === "undefined") {
    console.warn("[SWIPER] Swiper non trovato, carica la libreria prima di index.js");
    return;
  }

  const root = getRoot(scope);

  const SELECTORS = [
    "[data-slider='collection']:not([data-slider='collection'] [data-slider='collection'])",
    "[data-slider='component']:not([data-slider='component'] [data-slider='component'])",
  ];

  const components = root.querySelectorAll(SELECTORS.join(","));
  if (!components.length) return;

  components.forEach((component) => {
    if (component.dataset.scriptInitialized === "true") return;
    component.dataset.scriptInitialized = "true";

    const type = (component.getAttribute("data-slider") || "component").toLowerCase();

    const swiperElement = component.querySelector(".slider_element");
    const swiperWrapper = component.querySelector(".slider_list");
    if (!swiperElement || !swiperWrapper) return;

    // Normalizzazione DOM (Webflow wrappers)
    flattenDisplayContents(swiperWrapper);
    removeCMSList(swiperWrapper);

    if (type === "component") {
      const shouldPrune = component.getAttribute("data-prune-empty") !== "false";
      if (shouldPrune) pruneEmptySlides(swiperWrapper);

      const slideCount = swiperWrapper.children.length;
      component.style.setProperty("--slide-count", String(Math.max(slideCount, 1)));

      const controls = component.querySelector(".slider_controls");
      if (slideCount <= 1) {
        if (controls) controls.style.display = "none";
        return;
      }
    }

    [...swiperWrapper.children].forEach((el) => el.classList.add("swiper-slide"));

    const followFinger = swiperElement.getAttribute("data-follow-finger") === "true";
    const freeMode = swiperElement.getAttribute("data-free-mode") === "true";
    const mousewheel = swiperElement.getAttribute("data-mousewheel") === "true";
    const slideToClickedSlide = swiperElement.getAttribute("data-slide-to-clicked") === "true";
    const speed = +swiperElement.getAttribute("data-speed") || 600;

    // Effetto opzionale
    const effectAttr = (swiperElement.getAttribute("data-effect") || "").toLowerCase();
    const defaultEffect = type === "component" ? "fade" : "";
    const effect = effectAttr || defaultEffect;

    const config = {
      slidesPerView: "auto",
      followFinger,
      loopAdditionalSlides: 10,
      freeMode,
      slideToClickedSlide,
      centeredSlides: false,
      autoHeight: false,
      speed,
      mousewheel: {
        enabled: mousewheel,
        forceToAxis: true,
      },
      keyboard: {
        enabled: true,
        onlyInViewport: true,
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

    if (effect === "fade") {
      config.effect = "fade";
      config.fadeEffect = { crossFade: true };
    }

    component.__swiper = new Swiper(swiperElement, config);
  });

  // Cleanup per scope
  root.__swiperCleanup = () => {
    root.querySelectorAll("[data-slider]").forEach((component) => {
      try {
        component.__swiper?.destroy(true, true);
      } catch {}

      delete component.__swiper;
      delete component.dataset.scriptInitialized;
    });
  };
}

function destroySwiperSliders(scope = document) {
  const root = getRoot(scope);
  try {
    root.__swiperCleanup?.();
  } catch {}
  try {
    delete root.__swiperCleanup;
  } catch {}
}

/* =====================
   ACCORDION
===================== */

function initAccordions(scope = document) {
  if (typeof gsap === "undefined") {
    console.warn("[ACCORDION] GSAP non trovato, carica GSAP prima di index.js");
    return;
  }

  const root = getRoot(scope);
  const components = root.querySelectorAll(".accordion_wrap");
  if (!components.length) return;

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

    const list = component.querySelector(".accordion_list");
    let previousIndex = null;
    const closeFunctions = [];

    if (list) {
      flattenDisplayContents(list);
      removeCMSList(list);
    }

    component.querySelectorAll(".accordion_component").forEach((card, cardIndex) => {
      const button = card.querySelector(".accordion_toggle_button");
      const content = card.querySelector(".accordion_content_wrap");

      if (!button || !content) {
        console.warn("[ACCORDION] Elementi mancanti:", card);
        return;
      }

      button.setAttribute("aria-expanded", "false");
      button.setAttribute("id", `accordion_button_${listIndex}_${cardIndex}`);
      content.setAttribute("id", `accordion_content_${listIndex}_${cardIndex}`);
      button.setAttribute("aria-controls", content.id);
      content.setAttribute("aria-labelledby", button.id);
      content.style.display = "none";

      const refresh = () => {
        try {
          if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
        } catch {}
      };

      const tl = gsap.timeline({
        paused: true,
        defaults: { duration: 0.3, ease: "power2.inOut" },
        onComplete: refresh,
        onReverseComplete: refresh,
      });

      tl.set(content, { display: "block" });
      tl.fromTo(content, { height: 0 }, { height: "auto" });

      const closeAccordion = () => {
        if (!card.classList.contains("is-active")) return;
        card.classList.remove("is-active");
        tl.reverse();
        button.setAttribute("aria-expanded", "false");
      };

      const openAccordion = (instant = false) => {
        if (closePrevious && previousIndex !== null && previousIndex !== cardIndex) {
          closeFunctions[previousIndex]?.();
        }
        previousIndex = cardIndex;
        button.setAttribute("aria-expanded", "true");
        card.classList.add("is-active");
        instant ? tl.progress(1) : tl.play();
      };

      closeFunctions[cardIndex] = closeAccordion;

      if (openByDefault === cardIndex + 1) openAccordion(true);

      button.addEventListener("click", () => {
        const isActive = card.classList.contains("is-active");
        if (isActive && closeOnSecondClick) {
          closeAccordion();
          previousIndex = null;
        } else {
          openAccordion();
        }
      });

      if (openOnHover) button.addEventListener("mouseenter", () => openAccordion());
    });
  });

  root.__accordionCleanup = () => {
    root.querySelectorAll(".accordion_wrap").forEach((component) => {
      delete component.dataset.scriptInitialized;
    });
  };
}

function destroyAccordions(scope = document) {
  const root = getRoot(scope);
  try {
    root.__accordionCleanup?.();
  } catch {}
  try {
    delete root.__accordionCleanup;
  } catch {}
}

/* =====================
   BARBA
===================== */

if (typeof barba !== "undefined") barba.init({
  debug: false,
  preventRunning: true,

  transitions: [
    {
      name: "fixed-fade-min",

      once({ next }) {
        // attende animazione loader-in prima di uscire
        hideLoader(2000);

        preventSamePageClicks();
        initDynamicYear(next?.container || document);
        initLenis();
        unlockScroll();
        try {
          window.lenis?.start?.();
        } catch {}

        const scope = next?.container || document;
        initSwiperSliders(scope);
        initAccordions(scope);

        forceNextPageToTop();
        refreshAfterEnter(0.05);
        refreshAfterEnter(0.25);
      },

      leave({ current }) {
        const y = window.scrollY || 0;

        // blocca interazioni durante la transizione
        document.documentElement.classList.add("is-transitioning");
        pauseLenis();
        lockScroll();

        try {
          if ("scrollRestoration" in history) history.scrollRestoration = "manual";
        } catch {}

        // fissa l'altezza per evitare jump durante il fixed
        document.body.style.height = `${current.container.getBoundingClientRect().height}px`;

        gsap.set(current.container, {
          position: "fixed",
          top: -y,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 2,
        });

        // evita che il next si sovrapponga visivamente durante la fade
        gsap.set(current.container, { willChange: "opacity, transform" });

        current.container.style.pointerEvents = "none";

        return gsap.to(current.container, {
          autoAlpha: 0,
          duration: 0.8,
          ease: "power1.inOut",
        });
      },

      enter({ next }) {
        forceNextPageToTop();

        // Nascondo il next finché inizializzo, così evito scatti visibili
        gsap.set(next.container, { autoAlpha: 0, willChange: "opacity" });

        initSwiperSliders(next.container);
        initAccordions(next.container);
        initDynamicYear(next.container);
        CssRetriggerAnimationsOnScroll(next.container);

        // removed refreshAfterEnter(0.01);

        return gsap.to(next.container, {
          delay: 0.3,
          autoAlpha: 1,
          duration: 1.25,
          ease: "power2.out",
          clearProps: "willChange",
        });
      },

      after({ current }) {
        unlockScroll();
        resumeLenis();
        document.documentElement.classList.remove("is-transitioning");
        // Cleanup quando il current è già sparito, evita snap visibili prima della transizione
        destroySwiperSliders(current?.container || document);
        destroyAccordions(current?.container || document);
        destroyCssRetriggerAnimationsOnScroll(current?.container || document);

        gsap.set(current.container, {
          clearProps: "position,top,left,right,width,zIndex,opacity,visibility,willChange,pointerEvents",
        });

        document.body.style.height = "";
      },
    },
  ],
});

/* =====================
   BARBA HOOKS
===================== */

if (window.barba && window.barba.hooks) {
  barba.hooks.beforeEnter(() => {
    forceNextPageToTop();
  });

  barba.hooks.beforeLeave(() => {
  });

  barba.hooks.afterEnter(() => {
    preventSamePageClicks();
    initDynamicYear(document);
    CssRetriggerAnimationsOnScroll(document);
    // evita micro-salti a fine transizione: riallinea Lenis sullo scroll attuale
    initLenis();
    try {
      window.lenis?.scrollTo?.(window.scrollY || 0, { immediate: true });
    } catch {}

    refreshAfterEnter(0.12);
    refreshAfterEnter(0.35);
  });
}

// Nota: per attivare il preset più “inerziale”, imposta in Webflow:
// <html data-lenis-preset="luxury">