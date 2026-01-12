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

  // Se il loader non esiste, consideralo già concluso
  if (!loader) {
    __loaderDone = true;
    document.documentElement.classList.remove("is-loading");
    try {
      document.dispatchEvent(new CustomEvent("loader:done"));
    } catch {}
    return Promise.resolve();
  }

  // Idempotente: se già in corso o finito, ritorna la stessa promise
  if (loader.__promise) return loader.__promise;

  const hasGSAP = typeof gsap !== "undefined";

  // Normalizza delay: supporta sia ms che seconds (se passa 2 => 2s)
  const delayMs = Number(delay) || 0;
  const exitDelaySec = delayMs >= 50 ? delayMs / 1000 : delayMs;

  const EXIT_DURATION = 0.8; // secondi

  loader.__isExiting = false;

  loader.__promise = new Promise((resolve) => {
    const finalize = () => {
      try {
        loader.remove();
      } catch {}

      // 🔑 safety: se per qualunque motivo non fosse già stato rimosso
      document.documentElement.classList.remove("is-loading");

      __loaderDone = true;
      try {
        document.dispatchEvent(new CustomEvent("loader:done"));
      } catch {}

      resolve();
    };

    // Se GSAP non c'è, fallback al comportamento precedente
    if (!hasGSAP) {
      setTimeout(() => {
        loader.classList.add("is-exiting");
        // Sblocca subito le animazioni del sito quando parte l'uscita
        document.documentElement.classList.remove("is-loading");
      }, delayMs);

      setTimeout(finalize, delayMs + EXIT_DURATION * 1000);
      return;
    }

    // --- GSAP: riproduce le animazioni CSS che avevi (logo-in + text-in + loader-out)

    const paths = loader.querySelectorAll(".u-svg path");
    const text = loader.querySelector(".loader_layout .u-text");

    // Stato iniziale anti-flash (non forziamo y: evita di sovrascrivere transform già presenti)
    gsap.set(loader, { autoAlpha: 1 });
    if (paths && paths.length) gsap.set(paths, { autoAlpha: 0 });
    if (text) gsap.set(text, { autoAlpha: 0 });

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        // Non fare nulla: l'uscita è schedulata separatamente
      },
    });

    // 1) LOGO-IN: opacity stagger (equivalente a: 1s ease-out, stagger 0.05s, start 0.6s)
    if (paths && paths.length) {
      tl.to(
        paths,
        {
          duration: 1,
          autoAlpha: 1,
          stagger: 0.04,
          ease: "power2.out",
        },
        0.3
      );
    }

    // 2) TEXT-IN: opacity (equivalente a: 1s ease-out 1.4s)
    if (text) {
      tl.to(
        text,
        {
          duration: 1,
          autoAlpha: 1,
          ease: "power2.out",
        },
        1.4
      );
    }

    // 3) USCITA: dopo exitDelaySec, fade + translateY(-1rem)
    const startExit = () => {
      if (loader.__isExiting) return;
      loader.__isExiting = true;

      // 🔑 sblocca subito le animazioni del sito quando parte l'uscita
      document.documentElement.classList.remove("is-loading");

      // 🔔 Hook per orchestrare overlap con la Hero
      try {
        document.dispatchEvent(new CustomEvent("loader:exit-start"));
      } catch {}

      // compat: mantieni la classe per eventuali stili collaterali
      loader.classList.add("is-exiting");
      loader.style.pointerEvents = "none";

      gsap.killTweensOf(loader);
      gsap.to(loader, {
        duration: EXIT_DURATION,
        autoAlpha: 0,
        // usa unità relative: evita hardcode px e rispetta il tuo "-1rem"
        y: "-1rem",
        ease: "power1.inOut",
        onComplete: finalize,
      });
    };

    // Schedula uscita dopo il delay richiesto
    gsap.delayedCall(Math.max(0, exitDelaySec), startExit);
  });

  return loader.__promise;
}

/* ==========================================================================
   CUSTOM CURSOR
   ========================================================================== */

function initCustomCursor() {
  if (window.__customCursorInit) return;
  window.__customCursorInit = true;

  gsap.set(".cursor", { xPercent: -50, yPercent: -50 });

  const xTo = gsap.quickTo(".cursor", "x", { duration: 0.6, ease: "power3" });
  const yTo = gsap.quickTo(".cursor", "y", { duration: 0.6, ease: "power3" });

  window.addEventListener("mousemove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
}


/* ==========================================================================
   HIDE/SHOW DESKTOP NAVBAR ON SCROLL
   ========================================================================== */

function initDetectScrollingDirection() {
  if (typeof gsap === "undefined") return;

  // Se esiste una bind precedente (Barba afterEnter), la smonto prima
  if (typeof window.__scrollDirCleanup === "function") {
    try {
      window.__scrollDirCleanup();
    } catch {}
    window.__scrollDirCleanup = null;
  }

  let lastScrollY = window.scrollY || 0;

  const desktopNav = document.querySelector(".nav_desktop_wrap");
  if (!desktopNav) return;

  const mm = gsap.matchMedia();

  mm.add(
    {
      isDesktop: "(min-width: 64em)",
      isMobile: "(max-width: 63.999em)",
    },
    (ctx) => {
      let ticking = false;

      const onScroll = () => {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
          const y = window.scrollY || 0;

          // Micro-soglia per ignorare jitter
          if (Math.abs(y - lastScrollY) < 20) {
            ticking = false;
            return;
          }

          const direction = y > lastScrollY ? "down" : "up";
          const started = y > 50;

          lastScrollY = y;

          document.body.setAttribute("data-scrolling-direction", direction);
          document.body.setAttribute("data-scrolling-started", String(started));

          // Solo desktop: nascondi/mostra intera nav
          if (ctx.conditions.isDesktop) {
            if (direction === "down" && started) {
              gsap.to(desktopNav, {
                yPercent: -150,
                duration: 0.9,
                ease: "power3.out",
                overwrite: true,
              });
            } else if (direction === "up") {
              gsap.to(desktopNav, {
                yPercent: 0,
                duration: 0.75,
                ease: "power2.out",
                overwrite: true,
              });
            }
          }

          ticking = false;
        });
      };

      window.addEventListener("scroll", onScroll, { passive: true });

      // Cleanup automatico quando matchMedia cambia o quando reinizializziamo (Barba)
      return () => window.removeEventListener("scroll", onScroll);
    }
  );

  // Salvo cleanup globale per evitare listener duplicati tra navigazioni Barba
  window.__scrollDirCleanup = () => {
    try {
      mm.revert();
    } catch {}
  };
}


/* ==========================================================================
   NAV MOBILE
   ========================================================================== */

function initMobileNavigation() {
  document.querySelectorAll('[data-navigation-status]').forEach((navEl) => {
    if (navEl.dataset.scriptInitialized) return;
    navEl.dataset.scriptInitialized = "true";

    // Tema: vogliamo applicarlo all'intero wrapper mobile, non solo al background
    const navWrap = navEl.querySelector(".nav_mobile_wrap") || navEl;
    const navBg = navEl.querySelector(".nav_background") || document.querySelector(".nav_background");

    // Shift verticale del contenuto pagina (sotto la nav) quando la nav mobile è aperta
    // Priorità target:
    // 1) attributo dedicato (se vuoi controllarlo da Webflow)
    // 2) container Barba attuale
    // 3) main
    // 4) fallback: body
    const shiftTarget =
      document.querySelector("[data-nav-shift-target]") ||
      document.querySelector('[data-barba="container"]') ||
      document.querySelector("main") ||
      document.body;

    // px di shift, configurabile su navEl via attribute: data-nav-shift-y="16"
    const SHIFT_Y = parseFloat(navEl.getAttribute("data-nav-shift-y") || "16");

    // Durate/ease (luxury, morbide) per accompagnare la discesa/salita del pannello
    const SHIFT_OPEN_DURATION = 0.95;
    const SHIFT_CLOSE_DURATION = 0.85;
    const SHIFT_OPEN_EASE = "power3.out";
    const SHIFT_CLOSE_EASE = "power2.inOut";

    // Micro overlap: in chiusura il rientro parte leggermente dopo
    const SHIFT_CLOSE_DELAY = 0.12;

    const getStatus = () => navEl.getAttribute("data-navigation-status");
    const setStatus = (value) => navEl.setAttribute("data-navigation-status", value);


    // Durate tema (più lunghe, come richiesto)
    const THEME_OPEN_DURATION = 0.5;
    const THEME_CLOSE_DURATION = 0.75;
    const PANEL_CLOSE_DURATION = 0.9; // match CSS --panel-close (900ms)
    const PANEL_CLOSE_OPACITY_DELAY = 0.1; // opacity delay
    const THEME_RESET_OVERLAP = 0.65; // % della chiusura a cui iniziare il reset tema
    const THEME_EASE = "power2.out";

    /* ==========================
       SHIFT HANDLER (contenuto pagina)
    ========================== */

    const shiftPageDown = () => {
      if (!shiftTarget) return;

      if (typeof gsap !== "undefined") {
        gsap.killTweensOf(shiftTarget);
        gsap.to(shiftTarget, {
          y: SHIFT_Y,
          duration: SHIFT_OPEN_DURATION,
          ease: SHIFT_OPEN_EASE,
          overwrite: "auto",
        });
        return;
      }

      // fallback senza GSAP
      shiftTarget.style.transform = `translate3d(0, ${SHIFT_Y}px, 0)`;
    };

    const shiftPageUp = (delaySec = 0) => {
      if (!shiftTarget) return;

      if (typeof gsap !== "undefined") {
        gsap.killTweensOf(shiftTarget);
        gsap.to(shiftTarget, {
          y: 0,
          delay: Math.max(0, Number(delaySec) || 0),
          duration: SHIFT_CLOSE_DURATION,
          ease: SHIFT_CLOSE_EASE,
          overwrite: "auto",
          // non puliamo transform per non rompere altre animazioni GSAP eventuali
        });
        return;
      }

      // fallback senza GSAP
      setTimeout(() => {
        shiftTarget.style.transform = "";
      }, Math.max(0, Number(delaySec) || 0) * 1000);
    };

    // Anti-spam click: impedisce nuovi toggle finché open/close non ha finito
    let isNavTransitioning = false;

    const getToggleButtons = () =>
      Array.from(navEl.querySelectorAll('[data-navigation-toggle="toggle"], [data-navigation-toggle="close"]'));

    const setTogglesEnabled = (enabled) => {
      const btns = getToggleButtons();
      btns.forEach((btn) => {
        // compatibile con <a>, <button>, ecc.
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

      try {
        fn?.();
      } catch {
        // se qualcosa esplode, riabilita comunque
        isNavTransitioning = false;
        setTogglesEnabled(true);
        return;
      }

      const unlock = () => {
        isNavTransitioning = false;
        setTogglesEnabled(true);
      };

      const ms = Math.max(0, Number(durationSeconds || 0)) * 1000;

      if (typeof gsap !== "undefined" && typeof gsap.delayedCall === "function") {
        gsap.delayedCall(Math.max(0, Number(durationSeconds || 0)), unlock);
      } else {
        setTimeout(unlock, ms);
      }
    };

    // Snapshot completo per ripristino perfetto a chiusura
    // Nota: lo teniamo su navEl per non “perderlo” tra close/open e per evitare race con delayedCall.
    navEl.__themeSnapshot = navEl.__themeSnapshot || null;

    /* ==========================
       THEME HANDLER
    ========================== */

    const getThemeVars = (themeName) => {
      try {
        if (!window.colorThemes || typeof colorThemes.getTheme !== "function") return null;
        return colorThemes.getTheme(themeName);
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

      // Se GSAP non c'è, fallback set immediato
      if (typeof gsap === "undefined") {
        Object.entries(vars).forEach(([k, v]) => {
          navWrap.style.setProperty(k, v);
        });
        return;
      }

      gsap.killTweensOf(navWrap);
      gsap.to(navWrap, {
        ...vars,
        duration,
        ease: THEME_EASE,
        overwrite: "auto",
      });
    };

    const forceThemeBrand = () => {
      const brandVars = getThemeVars("brand");
      if (!brandVars) return;

      tweenToVars(brandVars, THEME_OPEN_DURATION);
      navWrap?.setAttribute?.("data-theme", "brand");

      // Backdrop opzionale (se esiste): lo rendiamo visibile quando la nav è aperta
      if (navBg && typeof gsap !== "undefined") {
        gsap.killTweensOf(navBg);
        gsap.to(navBg, { autoAlpha: 1, duration: THEME_OPEN_DURATION, ease: THEME_EASE, overwrite: "auto" });
      } else if (navBg) {
        navBg.style.opacity = "1";
        navBg.style.visibility = "visible";
      }
    };

    const restorePreviousTheme = (snap = navEl.__themeSnapshot) => {
      // Se non ho snapshot, faccio comunque un reset “hard” (pulito) dei marker/override
      if (!navWrap) return;

      // Copia locale per evitare che `navEl.__themeSnapshot` venga mutato durante i delayedCall
      const s = snap;

      // Caso limite: non ho nulla da ripristinare, quindi pulisco il minimo indispensabile
      if (!s) {
        try {
          navWrap.removeAttribute("data-theme");
          navWrap.removeAttribute("style");
        } catch {}
        if (navBg) {
          try {
            navBg.removeAttribute("style");
          } catch {}
        }
        return;
      }

      // 1) Animazione di ritorno alle vars precedenti (se disponibili)
      if (s.varsSnapshot) {
        tweenToVars(s.varsSnapshot, THEME_CLOSE_DURATION);
      }

      // 2) Backdrop: ritorna allo stato originale con tween coerente
      if (navBg && typeof gsap !== "undefined") {
        gsap.killTweensOf(navBg);
        gsap.to(navBg, {
          autoAlpha: Number.isFinite(s.bgAutoAlpha) ? s.bgAutoAlpha : 0,
          duration: THEME_CLOSE_DURATION,
          ease: THEME_EASE,
          overwrite: "auto",
        });
      }

      // 3) A fine tween, ripristino ESATTO degli attributi/style originali
      const finalizeRestore = () => {
        try {
          // wrapper style
          if (s.wrapStyle) navWrap.setAttribute("style", s.wrapStyle);
          else navWrap.removeAttribute("style");

          // backdrop style
          if (navBg) {
            if (s.bgStyle) navBg.setAttribute("style", s.bgStyle);
            else navBg.removeAttribute("style");
          }

          // data-theme
          if (s.hadThemeAttr) {
            if (s.themeAttr != null && s.themeAttr !== "") navWrap.setAttribute("data-theme", s.themeAttr);
            else navWrap.removeAttribute("data-theme");
          } else {
            navWrap.removeAttribute("data-theme");
          }
        } catch {}

        // IMPORTANT: pulisco lo snapshot solo se è ancora quello corrente
        if (navEl.__themeSnapshot === s) navEl.__themeSnapshot = null;
      };

      if (typeof gsap !== "undefined") {
        gsap.delayedCall(THEME_CLOSE_DURATION, finalizeRestore);
      } else {
        setTimeout(finalizeRestore, THEME_CLOSE_DURATION * 1000);
      }
    };

    // Helpers per gestione stato nav + Lenis/scroll
    const openNav = () => {
      // durata di lock: deve coprire l’intera apertura (tema + eventuali animazioni pannello)
      const LOCK_DUR = Math.max(THEME_OPEN_DURATION, 0.6);

      withNavTransitionLock(() => {
        // Snapshot ad OGNI apertura (così non ti rimane "appeso" un vecchio snapshot)
        const brandVars = getThemeVars("brand");
        const brandKeys = brandVars ? Object.keys(brandVars) : [];

        navEl.__themeSnapshot = {
          hadThemeAttr: !!navWrap?.hasAttribute?.("data-theme"),
          themeAttr: navWrap?.getAttribute?.("data-theme"),
          wrapStyle: navWrap?.getAttribute?.("style") || "",
          bgStyle: navBg?.getAttribute?.("style") || "",
          // valori attuali delle vars che andremo a sovrascrivere con "brand"
          varsSnapshot: brandKeys.length ? snapshotCurrentVars(brandKeys) : null,
          // stato attuale backdrop (se esiste)
          bgAutoAlpha: navBg ? parseFloat(window.getComputedStyle(navBg).opacity || "0") : 0,
        };

        setStatus("active");
        try {
          pauseLenis();
          lockScroll();
        } catch {}

        // 🔹 FORZA SEMPRE BRAND (animato)
        forceThemeBrand();
        // 🔹 SHIFT contenuto pagina verso il basso (elegante)
        shiftPageDown();
      }, LOCK_DUR);
    };

    const closeNav = () => {
      const CLOSE_TOTAL_DURATION = PANEL_CLOSE_DURATION + PANEL_CLOSE_OPACITY_DELAY;
      const CLOSE_THEME_RESET_AT = CLOSE_TOTAL_DURATION * THEME_RESET_OVERLAP;

      const LOCK_DUR = Math.max(
        CLOSE_TOTAL_DURATION,
        THEME_CLOSE_DURATION,
        0.6
      );

      withNavTransitionLock(() => {
        setStatus("not-active");
        // 🔹 Rientro contenuto pagina (micro overlap)
        shiftPageUp(SHIFT_CLOSE_DELAY);

        try {
          unlockScroll();
          resumeLenis();
        } catch {}

        // Ritarda il reset tema fino a pannello completamente chiuso
        const snap = navEl.__themeSnapshot;

        if (typeof gsap !== "undefined") {
          gsap.delayedCall(CLOSE_THEME_RESET_AT, () => {
            restorePreviousTheme(snap);
          });
        } else {
          setTimeout(() => restorePreviousTheme(snap), CLOSE_THEME_RESET_AT * 1000);
        }
      }, LOCK_DUR);
    };

    // Helper: normalizza path per confronto “stessa destinazione”
    const normPath = (path) =>
      (path || "")
        .replace(/\/index\.html?$/i, "")
        .replace(/\/+$/g, "") || "/";

    // Helper: true se il link punta ESATTAMENTE alla pagina corrente (path + query + hash)
    const isSameDestination = (anchorEl) => {
      if (!anchorEl) return false;

      const href = anchorEl.getAttribute("href");
      if (!href || href === "#") return false;

      let dest;
      try {
        dest = new URL(href, window.location.href);
      } catch {
        return false;
      }

      // solo stessi origin
      if (dest.origin !== window.location.origin) return false;

      const curPath = normPath(window.location.pathname);
      const destPath = normPath(dest.pathname);

      const samePath = destPath === curPath;
      const sameQuery = dest.search === window.location.search;
      const sameHash = (dest.hash || "") === (window.location.hash || "");

      return samePath && sameQuery && sameHash;
    };

    navEl
      .querySelectorAll('[data-navigation-toggle="toggle"]')
      .forEach((toggleBtn) => {
        toggleBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (isNavTransitioning) return;
          const isOpen = getStatus() === "active";
          isOpen ? closeNav() : openNav();
        });
      });

    navEl
      .querySelectorAll('[data-navigation-toggle="close"]')
      .forEach((closeBtn) => {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (isNavTransitioning) return;
          closeNav();
        });
      });

    // Close on menu link click (compatibile con Barba)
    // Caso extra: se clicchi un link che punta alla STESSA destinazione della pagina corrente,
    // evita ogni navigazione e chiudi soltanto la nav.
    navEl.querySelectorAll(".nav_mobile_menu_link, .nav_mobile_logo").forEach((link) => {
      link.addEventListener("click", (e) => {
        if (isNavTransitioning) return;
        if (getStatus() === "active" && isSameDestination(link)) {
          e.preventDefault();
          closeNav();
          return;
        }

        closeNav();
        // Barba gestisce automaticamente la navigazione sui link interni
      });
    });

    /* ==========================
       ESC KEY (safe con Barba)
    ========================== */

    if (navEl.__escHandler) {
      document.removeEventListener("keydown", navEl.__escHandler);
    }

    navEl.__escHandler = (e) => {
      if (e.key === "Escape" && getStatus() === "active") {
        closeNav();
      }
    };

    document.addEventListener("keydown", navEl.__escHandler);
  });
}


/* ==========================================================================
   RESET WEBFLOW
   ========================================================================== */

function resetWebflow(data) {
  if (typeof window.Webflow === "undefined") return;

  try {

    const parser = new DOMParser();
    const doc = parser.parseFromString(data.next.html, "text/html");
    const webflowPageId = doc.querySelector("html")?.getAttribute("data-wf-page");
    if (webflowPageId) {
      document.documentElement.setAttribute("data-wf-page", webflowPageId);
    }

    window.Webflow.destroy?.();

    setTimeout(() => {
      try {
        window.Webflow.ready?.();

        const ix2 = window.Webflow.require?.("ix2");
        if (ix2 && typeof ix2.init === "function") {
          ix2.init();
        } else {
        }

        const forms = window.Webflow.require?.("forms");
        if (forms && typeof forms.ready === "function") {
          forms.ready();
        }

        window.Webflow.redraw?.up?.();
      } catch (innerErr) {
        console.warn("⚠️ Errore durante il reset Webflow:", innerErr);
      }
    }, 100);

  } catch (err) {
    console.warn("⚠️ Errore nella reinizializzazione di Webflow:", err);
  }
}

/* ==========================================================================
   SIGNATURE STUDIO OLIMPO
   ========================================================================== */
function initSignature() {
  console.log(
    "%cCredits: Studio Olimpo | Above the ordinary – %chttps://www.studioolimpo.it",
    "background:#F8F6F1; color:#000; font-size:12px; padding:10px 0 10px 14px;",
    "background:#F8F6F1; color:#000; font-size:12px; padding:10px 14px 10px 0; text-decoration:none;"
  );
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
  // Preset supportati:
  // - default: valore standard
  // - luxury: (ora usa i valori di luxury-plus: più inerzia, feeling premium)

  const isFinePointer = !isCoarsePointer;
  const isLuxury = isFinePointer && preset === "luxury";

  // luxury = luxury-plus (più inerzia, feeling premium)
  const lerp = isLuxury ? 0.055 : 0.1;
  const wheelMultiplier = isLuxury ? 0.75 : 1;

  lenis = new Lenis({
    smoothWheel: true,
    smoothTouch: false,
    gestureOrientation: "vertical",
    wheelMultiplier,
    touchMultiplier: 1,
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

function refreshAfterEnter(delay = 0.02) {
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

/* =====================
   PREVENT SAME PAGE CLICKS
===================== */

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
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1 ||
      a.target === "_blank" || a.hasAttribute("download") || a.rel === "external" ||
      a.dataset.allowSame === "true" ||
      !href || h === "#" || h === "" || h.startsWith("javascript:") || h.startsWith("mailto:") || h.startsWith("tel:")
    );
  };

  const getOffset = () =>
    parseFloat(document.documentElement.getAttribute("data-anchor-offset") || "0") || 0;

  const getTarget = (hash) => {
    if (!hash) return null;
    const id = decodeURIComponent(hash.slice(1));
    return document.getElementById(id) || document.querySelector(`#${CSS?.escape ? CSS.escape(id) : id}`);
  };

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a[href]");
      if (!a || isSkippable(a, e)) return;

      let dest;
      try { dest = new URL(a.getAttribute("href"), location.href); } catch { return; }
      if (dest.origin !== location.origin) return;

      const sameBase = norm(dest.pathname) === norm(location.pathname) && dest.search === location.search;
      if (!sameBase) return;

      e.preventDefault();

      const offset = getOffset();
      if (dest.hash) {
        const target = getTarget(dest.hash);
        if (target) {
          window.lenis?.scrollTo ? window.lenis.scrollTo(target, { offset: -offset }) : target.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }

      if ((window.scrollY || 0) < 2) return;
      window.lenis?.scrollTo ? window.lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" });
    },
    true
  );
}


/* =====================
   UPDATE LINK STYLE NAVBAR
===================== */
function initBarbaNavUpdate(data) {
  if (!data?.next?.html) return;

  const $next = $(data.next.html).find('[data-barba-update="nav"]');
  if (!$next.length) return;

  $('[data-barba-update="nav"]').each(function (index) {
    const $source = $($next[index]);
    if (!$source.length) return;

    const ariaCurrent = $source.attr("aria-current");
    if (ariaCurrent !== undefined) {
      $(this).attr("aria-current", ariaCurrent);
    } else {
      $(this).removeAttr("aria-current");
    }

    const className = $source.attr("class");
    if (className !== undefined) {
      $(this).attr("class", className);
    }
  });
}

/* =====================
   FOOTER YEAR
===================== */
function initDynamicYear(scope = document) {
  const root = getRoot(scope);
  root.querySelectorAll("[data-dynamic-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}


/* =====================
   SLIDESHOW STOPMOTION
===================== */
function initStopmotionSlideshow(scope, delayOverrideSec) {
  scope = scope || document;

  const wraps = scope.querySelectorAll(".slideshow-wrapper");
  if (!wraps.length) return;

  wraps.forEach((wrap) => {
    // Guard against double init (Barba re-enters)
    if (wrap.hasAttribute("data-stopmotion-initialized")) return;
    wrap.setAttribute("data-stopmotion-initialized", "true");

    const visualCol = wrap.querySelector(".u-layout-column-2");
    if (!visualCol) return;

    // NEW: stack container that holds the frames
    const stack = visualCol.querySelector(".slideshow_wrap");
    if (!stack) return;

    // NEW: frames are the inner .u-image-wrapper elements inside stack (exclude stack itself)
    const frames = Array.from(
      stack.querySelectorAll(
        '.u-image-wrapper[data-wf--visual-image--variant="cover"]',
      ),
    );

    if (frames.length < 2) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Tuning via attributes (seconds)
    const HOLD = parseFloat(wrap.getAttribute("data-stopmotion-hold")) || 2.5;
    const FADE = parseFloat(wrap.getAttribute("data-stopmotion-fade")) || 1.0;

    // Start delay (seconds) to avoid overlapping the Hero intro
    // Priority: function override > data attribute > default
    const START_DELAY =
      Number.isFinite(delayOverrideSec)
        ? delayOverrideSec
        : parseFloat(wrap.getAttribute("data-stopmotion-start-delay")) || 3.0;

    // Prepare stacking (relative on stack, absolute on frames)
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

    // Reduced motion: keep first visible only
    if (reduceMotion) return;

    // Kill any previous timeline/trigger if somehow present
    if (wrap.__stopmotionTl) wrap.__stopmotionTl.kill();
    if (wrap.__stopmotionST) wrap.__stopmotionST.kill();
    try {
      wrap.__stopmotionStartCall?.kill?.();
    } catch {}
    wrap.__stopmotionStartCall = null;

    // Looping crossfade timeline
    const tl = gsap.timeline({
      paused: true,
      repeat: -1,
      defaults: { ease: "none" },
    });

    for (let i = 0; i < frames.length; i++) {
      const current = frames[i];
      const next = frames[(i + 1) % frames.length];

      // Hold current fully visible
      tl.to({}, { duration: HOLD });

      // Crossfade
      tl.to(current, { autoAlpha: 0, duration: FADE }, ">");
      tl.to(next, { autoAlpha: 1, duration: FADE }, "<");

      // Keep stacking consistent
      tl.set(current, { zIndex: 1 });
      tl.set(next, { zIndex: 2 });
    }

    wrap.__stopmotionTl = tl;

    // Start (delayed) + viewport control
    const start = () => {
      // If the element has been removed during transitions, abort safely
      if (!document.documentElement.contains(wrap)) return;

      // Play/pause only when in viewport (se ScrollTrigger è disponibile)
      if (typeof ScrollTrigger !== "undefined") {
        wrap.__stopmotionST = ScrollTrigger.create({
          trigger: wrap,
          start: "top bottom",
          end: "bottom top",
          onEnter: () => tl.play(),
          onEnterBack: () => tl.play(),
          onLeave: () => tl.pause(),
          onLeaveBack: () => tl.pause(),
        });

        // If already visible at init time, start immediately
        if (typeof ScrollTrigger.isInViewport === "function" && ScrollTrigger.isInViewport(wrap, 0.1)) {
          tl.play();
        }
      } else {
        // Fallback: se non c'è ScrollTrigger, avvia subito il loop
        tl.play();
      }
    };

    if (typeof gsap !== "undefined" && typeof gsap.delayedCall === "function") {
      wrap.__stopmotionStartCall = gsap.delayedCall(START_DELAY, start);
    } else {
      const t = setTimeout(start, START_DELAY * 1000);
      wrap.__stopmotionStartCall = { kill: () => clearTimeout(t) };
    }
  });
}



/* ==========================================================================
   FORM – SUCCESS CUSTOM TRANSITION (Webflow)
   Dipendenza: jQuery (Webflow lo include di default)
   ========================================================================== */

function initFormSuccessTransition(scope = document) {
  if (typeof window.jQuery === "undefined" || typeof window.$ === "undefined") {
    return;
  }

  const $root = $(scope);
  const $forms = $root.find(".w-form form");
  if (!$forms.length) return;

  const DEFAULT_REDIRECT_URL = "/";
  const DEFAULT_REDIRECT_DELAY = 3500;
  const DEFAULT_POLL_TIMEOUT = 8000;
  const POLL_EVERY = 100;

  function forceHideNativeMessages($container) {
    $container.find(".w-form-done, .w-form-fail").each(function () {
      this.style.setProperty("display", "none", "important");
      this.style.setProperty("opacity", "0", "important");
      this.style.setProperty("visibility", "hidden", "important");
      this.style.setProperty("position", "absolute", "important");
      this.style.setProperty("pointer-events", "none", "important");
    });
  }

  forceHideNativeMessages($root);

  function fadeInSuccess(successSection) {
    // assicurati che sia sopra e non “sparisca” durante il cambio pagina
    successSection.style.display = "flex";
    successSection.style.pointerEvents = "auto";
    successSection.style.position = "fixed";
    successSection.style.inset = "0";
    successSection.style.zIndex = "9999";

    if (typeof gsap !== "undefined") {
      gsap.killTweensOf(successSection);
      gsap.set(successSection, { autoAlpha: 0 });
      gsap.to(successSection, { autoAlpha: 1, duration: 0.9, ease: "power2.out" });
    } else {
      successSection.classList.add("is-visible");
    }
  }

  function fadeOutSuccess(successSection, onComplete) {
    if (!successSection) return;

    if (typeof gsap !== "undefined") {
      // evita conflitti con animazioni residue
      gsap.killTweensOf(successSection);

      // stato coerente prima dell’uscita
      gsap.set(successSection, {
        willChange: "opacity, transform, filter",
        transformOrigin: "50% 50%",
        pointerEvents: "none",
      });

      const tl = gsap.timeline({
        onComplete: () => {
          successSection.style.display = "none";
          // pulizia props per evitare accumuli tra pagine
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

      return;
    }

    // fallback senza GSAP
    successSection.style.pointerEvents = "none";
    successSection.style.transition = "opacity 650ms cubic-bezier(0.16, 1, 0.3, 1)";
    successSection.style.opacity = "0";

    setTimeout(() => {
      successSection.style.display = "none";
      successSection.style.transition = "";
      successSection.style.opacity = "";
      if (typeof onComplete === "function") onComplete();
    }, 650);
  }

  /**
   * Obiettivo:
   * - avviare la navigazione prima
   * - dissolvere il success SOLO quando la nuova pagina è già entrata
   */
  function navigateThenHideOverlay(redirectUrl, successSection) {
    // se non c’è Barba, fallback classico: naviga e basta
    if (typeof barba === "undefined" || typeof barba.go !== "function") {
      // qui non puoi garantire “già in home” prima del fade, perché la navigazione hard ricarica
      window.location.href = redirectUrl;
      return;
    }

    let done = false;

    const safeFadeOut = () => {
      if (done) return;
      done = true;
      fadeOutSuccess(successSection);
    };

    // Fallback safety: se per qualunque motivo non ricevi hook/promise, non restare bloccato
    const SAFETY_TIMEOUT = 4000;
    const safetyTimer = setTimeout(safeFadeOut, SAFETY_TIMEOUT);

    // 1) Prova via Promise (più semplice e di solito perfetta)
    let maybePromise;
    try {
      maybePromise = barba.go(redirectUrl);
    } catch (e) {
      clearTimeout(safetyTimer);
      // se barba.go esplode, fallback hard
      window.location.href = redirectUrl;
      return;
    }

    // se barba.go ritorna una Promise, aspetta la fine della transizione
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise
        .then(() => {
          clearTimeout(safetyTimer);
          safeFadeOut(); // ora sei già nella nuova pagina
        })
        .catch(() => {
          clearTimeout(safetyTimer);
          // in caso di errore, almeno non restare con overlay bloccato
          safeFadeOut();
        });

      return;
    }

    // 2) Se non c’è Promise, usa hook one-shot afterEnter
    const afterEnterOnce = () => {
      clearTimeout(safetyTimer);
      safeFadeOut();
      barba.hooks.afterEnter(afterEnterOnce); // Barba non ha "off" ufficiale in tutte le build, quindi re-hook innocuo
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

    forceHideNativeMessages($wForm);
    $form.show();

    const successSection = document.querySelector("#success-form");
    if (!successSection) return;

    fadeInSuccess(successSection);

    const redirectUrl =
      successSection.getAttribute("data-success-redirect") || DEFAULT_REDIRECT_URL;

    const redirectDelay =
      Number(successSection.getAttribute("data-success-redirect-delay")) ||
      DEFAULT_REDIRECT_DELAY;

    // Qui mantieni il tuo “tempo di lettura” del success.
    // Quando scade, NON dissolvi subito: avvii Barba e dissolvi solo a transizione finita.
    setTimeout(() => {
      navigateThenHideOverlay(redirectUrl, successSection);
    }, redirectDelay);
  }

  function waitForWebflowSuccess($form) {
    const $wForm = $form.closest(".w-form");
    const start = Date.now();

    const tick = () => {
      const $success = $wForm.find(".w-form-done");
      const $fail = $wForm.find(".w-form-fail");

      const successStyle = $success.attr("style") || "";
      const hasSuccessStyle =
        successStyle.includes("display: block") || successStyle.includes("display:block");

      const failStyle = $fail.attr("style") || "";
      const hasFailStyle =
        failStyle.includes("display: block") || failStyle.includes("display:block");

      if (hasFailStyle) return;

      if ($success.length && hasSuccessStyle) {
        showSuccessAndRedirect($form);
        return;
      }

      if (Date.now() - start > DEFAULT_POLL_TIMEOUT) return;

      setTimeout(tick, POLL_EVERY);
    };

    tick();
  }

  $forms.each(function () {
    const $form = $(this);
    if ($form.data("bound-success")) return;
    $form.data("bound-success", true);

    $form.on("submit", function () {
      const $wForm = $form.closest(".w-form");
      forceHideNativeMessages($wForm);
      waitForWebflowSuccess($form);
    });
  });
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
    const slideToClickedSlide =
      swiperElement.getAttribute("data-slide-to-clicked") === "true";
    const speed = +swiperElement.getAttribute("data-speed") || 600;
    const loop = swiperElement.getAttribute("data-loop") === "true";

    // Effetto opzionale
    const effectAttr = (swiperElement.getAttribute("data-effect") || "").toLowerCase();
    const defaultEffect = type === "component" ? "fade" : "";
    const effect = effectAttr || defaultEffect;

    const config = {
      slidesPerView: "auto",
      followFinger,
      loop,
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
   GSAP SCROLL REVEALS
   - standardizza i reveal con ScrollTrigger
   - evita flash: gli elementi partono invisibili e vengono rivelati onEnter
   - safe con Barba: init/destroy per scope
===================== */

/* =====================
   HERO INTRO (home)
   - stile Ilja: reveal elegante, timing controllato, no ScrollTrigger
   - target: section[data-anim="hero"] (o data-anim="hero-home")
   - safe con Barba: init/destroy per scope
===================== */

function initHeroIntro(scope = document) {
  if (typeof gsap === "undefined") {
    console.warn("[HERO] GSAP non trovato, hero intro disattivato");
    return;
  }

  const root = getRoot(scope);

  // Evita doppia init nello stesso scope
  if (root.__heroIntroInit === true) return;
  root.__heroIntroInit = true;

  // Helper: trova il primo elemento esistente e visibile (non display:none, non visibility:hidden)
  const pickFirstVisible = (nodes) => {
    const arr = Array.isArray(nodes) ? nodes : Array.from(nodes || []);
    for (const el of arr) {
      if (!el) continue;
      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      return el;
    }
    return null;
  };

  // Target hero: un solo boundary affidabile.
  // Priorità:
  // 1) data-hero="wrap" (consigliato)
  // 2) fallback storici già presenti
  const hero =
    root.querySelector('[data-hero="wrap"]') ||
    root.querySelector("#hero-home") ||
    root.querySelector('[data-anim="hero"], [data-anim="hero-home"], [data-hero="wrap"]');

  if (!hero) return;

  // Se prefer-reduced-motion: mostra tutto subito
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // ==========================
  // PARTS RESOLUTION (NO data-hero media/content)
  // ==========================

  // Contenuto testuale: priorità su wrapper specifico.
  // Fallback: colonna 1, ma SOLO se è dentro la hero.
  const contentWrap =
    hero.querySelector(".u-content-wrapper") ||
    hero.querySelector(".u-layout-column-1") ||
    null;

  // Media: cerchiamo un media wrapper che non sia dentro il contentWrap.
  // Supportiamo immagine singola, slider, stopmotion stack.
  const mediaCandidates = [];

  // 1) Slider (se presente) dentro colonna visual
  mediaCandidates.push(
    ...hero.querySelectorAll(
      ".slideshow_wrap, .slider_wrap, [data-slider='component'], [data-slider='collection']"
    )
  );

  // 2) Wrapper immagine singola
  mediaCandidates.push(...hero.querySelectorAll(".u-image-wrapper"));

  // Filtra candidati: escludi quelli dentro il contentWrap (per evitare collisioni)
  const filteredMedia = mediaCandidates.filter((el) => {
    if (!el) return false;
    if (contentWrap && contentWrap.contains(el)) return false;
    // escludi eventuali immagini decorative tiny, se servisse in futuro: per ora nulla
    return true;
  });

  const mediaWrap = pickFirstVisible(filteredMedia);

  // Child list per stagger: vogliamo la grammatica della home (stagger morbido).
  // Se non ho contentWrap, niente contenuto da animare.
  const contentChildren = contentWrap ? Array.from(contentWrap.children) : [];

  // Se reduce motion: stato finale immediato
  if (reduceMotion) {
    if (mediaWrap) {
      // media: visibile, no blur
      gsap.set(mediaWrap, { autoAlpha: 1, filter: "blur(0px)", clearProps: "transform" });
    }
    if (contentChildren.length) {
      gsap.set(contentChildren, { autoAlpha: 1, clearProps: "transform" });
    }
    root.__heroIntroTl = null;
    return;
  }

  // Timeline (pausata): verrà avviata da playHeroIntro
  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power1.inOut" },
  });

  // ==========================
  // INITIAL STATE (anti-flash)
  // ==========================

  if (mediaWrap) {
    // Nota: non forziamo y/scale per non interferire con layout e slider.
    gsap.set(mediaWrap, {
      autoAlpha: 0,
      filter: "blur(8px)",
      willChange: "opacity, filter",
    });
  }

  if (contentChildren.length) {
    gsap.set(contentChildren, {
      autoAlpha: 0,
      willChange: "opacity",
    });
  }

  // ==========================
  // ANIMATION GRAMMAR (match hero home)
  // ==========================

  // Media: fade + blur to 0
  if (mediaWrap) {
    tl.to(
      mediaWrap,
      {
        duration: 0.7,
        autoAlpha: 1,
        filter: "blur(0px)",
        onComplete: () => {
          try {
            mediaWrap.style.willChange = "";
          } catch {}
        },
      },
      0
    );
  }

  // Content: fade stagger morbido
  if (contentChildren.length) {
    tl.to(
      contentChildren,
      {
        duration: 1,
        autoAlpha: 1,
        stagger: 0.3,
        onComplete: () => {
          contentChildren.forEach((el) => {
            try {
              el.style.willChange = "";
            } catch {}
          });
        },
      },
      0.25
    );
  }

  // Salva timeline su scope
  root.__heroIntroTl = tl;

  // Cleanup
  root.__heroIntroCleanup = () => {
    try {
      root.__heroIntroTl?.kill?.();
    } catch {}

    try {
      delete root.__heroIntroTl;
      delete root.__heroIntroCleanup;
      delete root.__heroIntroInit;
    } catch {}
  };
}

/**
 * Avvia la Hero intro con delay configurabile.
 * Nota: la Hero timeline è creata da `initHeroIntro(scope)` ed è `paused: true`.
 * @param {Element|Document} scope
 * @param {number} delaySec - delay in secondi (es. 0.1 first load, 0.15 transition)
 */
function playHeroIntro(scope = document, delaySec = 0) {
  if (typeof gsap === "undefined") return;

  const root = getRoot(scope);
  const tl = root.__heroIntroTl;
  if (!tl) {
    // Se non c'è una hero timeline, segnala comunque che la hero è "done" per non bloccare le sezioni.
    try {
      document.dispatchEvent(new CustomEvent("hero:intro-done"));
    } catch {}
    return;
  }

  // evita replay accidentali
  if (tl.__played) return;
  tl.__played = true;

  const d = Math.max(0, Number(delaySec) || 0);

  gsap.delayedCall(d, () => {
    try {
      // Notifica start
      try {
        document.dispatchEvent(new CustomEvent("hero:intro-start"));
      } catch {}

      // Notifica done quando la timeline ha finito
      const prevOnComplete = tl.eventCallback("onComplete");
      tl.eventCallback("onComplete", () => {
        try {
          prevOnComplete?.();
        } catch {}
        try {
          document.dispatchEvent(new CustomEvent("hero:intro-done"));
        } catch {}
      });

      tl.play(0);
    } catch {
      // Safety: se qualcosa va storto, non bloccare l'orchestrazione
      try {
        document.dispatchEvent(new CustomEvent("hero:intro-done"));
      } catch {}
    }
  });
}

function destroyHeroIntro(scope = document) {
  const root = getRoot(scope);
  try {
    root.__heroIntroCleanup?.();
  } catch {}
  try {
    delete root.__heroIntroCleanup;
  } catch {}
}

function initScrollReveals(scope = document) {
  // Richiede GSAP + ScrollTrigger
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("[REVEAL] GSAP/ScrollTrigger non trovati, reveals disattivati");
    return;
  }

  const root = getRoot(scope);

  // Evita doppia init nello stesso scope
  if (root.__revealInit === true) return;
  root.__revealInit = true;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;

  // Orchestrazione: ritarda SOLO le sezioni già visibili above the fold (desktop)
  // così partono dopo la Hero e con uno stagger per sezione.
  const DESKTOP_GRACE_DELAY = 0.45; // dopo hero
  const DESKTOP_QUEUE_STAGGER = 0.18; // tra sezioni già visibili
  const SAFETY_UNLOCK_SEC = 1.2;

  const created = {
    triggers: [],
    contexts: [],
  };

  const isInsideHero = (el) => !!el?.closest?.('[data-hero="wrap"]');

  // Esclusioni globali (senza data-attributes): hero (già), footer, nav, loader
  const isExcluded = (el) => {
    if (!el) return true;
    if (isInsideHero(el)) return true;
    if (el.closest("footer")) return true;
    if (el.closest(".nav_component, .nav_desktop_wrap, .nav_mobile_wrap")) return true;
    if (el.closest(".loader_wrap")) return true;
    return false;
  };

  const isInViewport = (el, threshold = 0.1) => {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    const vw = window.innerWidth || 0;
    if (!vh || !vw) return false;

    const topVisible = r.top <= vh * (1 - threshold);
    const bottomVisible = r.bottom >= vh * threshold;
    const leftVisible = r.left <= vw;
    const rightVisible = r.right >= 0;

    return topVisible && bottomVisible && leftVisible && rightVisible;
  };

  // Evita di pescare target dentro altre section annidate
  const isInSameSection = (node, section) => {
    const closestSection = node?.closest?.("section.u-section");
    return closestSection === section;
  };

  // Colleziona target “Lumos-friendly” senza data attributes.
  // Strategia:
  // - anima elementi semantici (content wrappers, headings, richtext, images, buttons)
  // - se non trovi nulla, anima i figli diretti “visivi” della section
  const collectSectionTargets = (section) => {
    if (!section || isExcluded(section)) return [];

    // 1) Target primari più affidabili
    const primarySelectors = [
      ".u-content-wrapper",
      ".u-text.w-richtext",
      ".u-rich-text.w-richtext",
      ".u-eyebrow-wrapper",
      ".u-button-wrapper",
      ".u-image-wrapper",
      ".slider_wrap",
      ".slideshow_wrap",
      ".accordion_wrap",
    ];

    let targets = Array.from(section.querySelectorAll(primarySelectors.join(",")))
      .filter((el) => el && !isExcluded(el))
      .filter((el) => isInSameSection(el, section));

    // 2) Dedup + filtra invisibili
    targets = Array.from(new Set(targets)).filter((el) => {
      try {
        const cs = window.getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden";
      } catch {
        return true;
      }
    });

    // 3) Fallback: figli diretti “consistenti” della section
    if (!targets.length) {
      targets = Array.from(section.children || []).filter((el) => {
        if (!el || isExcluded(el)) return false;
        // evita spacer e background slot
        if (el.classList?.contains("u-section-spacer")) return false;
        if (el.classList?.contains("u-background-slot")) return false;
        return true;
      });
    }

    return targets;
  };

  // ---- UNLOCK GATE (per ritardare solo gli elementi già visibili) ----
  let unlocked = false;
  const aboveFoldQueue = []; // { tl, top }

  const enqueueAboveFold = (tl, top) => {
    if (!tl) return;
    // Mobile/touch: niente code, play immediato
    if (isCoarsePointer) {
      tl.play(0);
      return;
    }
    aboveFoldQueue.push({ tl, top });
  };

  const flushAboveFoldQueue = () => {
    if (!aboveFoldQueue.length) return;
    aboveFoldQueue.sort((a, b) => a.top - b.top);

    const base = isCoarsePointer ? 0 : DESKTOP_GRACE_DELAY;
    const step = isCoarsePointer ? 0 : DESKTOP_QUEUE_STAGGER;

    aboveFoldQueue.forEach((u, i) => {
      const tl = u?.tl;
      if (!tl) return;
      if (tl.isActive() || tl.progress() > 0) return;

      gsap.delayedCall(Math.max(0, base + i * step), () => {
        try {
          if (tl.isActive() || tl.progress() > 0) return;
          tl.play(0);
        } catch {}
      });
    });

    aboveFoldQueue.length = 0;
  };

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    flushAboveFoldQueue();
  };

  const onHeroDone = () => {
    document.removeEventListener("hero:intro-done", onHeroDone);
    unlock();
  };

  document.addEventListener("hero:intro-done", onHeroDone);
  gsap.delayedCall(SAFETY_UNLOCK_SEC, unlock);

  // ---- FACTORY: timeline reveal section (grammatica coerente con Hero, ma da scroll) ----
  const makeSectionRevealTl = (targets) => {
    if (!targets || !targets.length) return null;

    if (reduceMotion) {
      gsap.set(targets, { autoAlpha: 1, clearProps: "transform" });
      return null;
    }

    // Stato iniziale: invisibili, leggero offset
    gsap.set(targets, {
      autoAlpha: 0,
      y: 24,
      willChange: "opacity, transform",
    });

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "power3.out" },
      onComplete: () => {
        targets.forEach((t) => {
          try {
            t.style.willChange = "";
          } catch {}
        });
      },
    });

    tl.to(targets, {
      duration: 0.9,
      autoAlpha: 1,
      y: 0,
      stagger: { each: 0.12, from: "start" },
      immediateRender: false,
    });

    return tl;
  };

  // Target: tutte le section Lumos, escluse hero/footer/nav/loader
  const sections = Array.from(root.querySelectorAll("section.u-section"))
    .filter((s) => !isExcluded(s));

  if (!sections.length) return;

  const ctx = gsap.context(() => {
    sections.forEach((section) => {
      const targets = collectSectionTargets(section);
      if (!targets.length) return;

      const tl = makeSectionRevealTl(targets);
      if (!tl) return;

      // Se la section è già visibile, la mettiamo in coda (desktop) e la facciamo partire dopo Hero
      if (isInViewport(section, 0.08) && !unlocked) {
        enqueueAboveFold(tl, section.getBoundingClientRect().top);
      }

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        once: true,
        onEnter: () => {
          if (tl.isActive() || tl.progress() > 0) return;

          // Se è above the fold e Hero non ha ancora sbloccato, mettila in coda
          if (!unlocked && isInViewport(section, 0.08)) {
            enqueueAboveFold(tl, section.getBoundingClientRect().top);
            return;
          }

          tl.play(0);
        },
      });

      created.triggers.push(st);
    });
  }, root);

  created.contexts.push(ctx);

  // Cleanup
  root.__revealCleanup = () => {
    try {
      document.removeEventListener("hero:intro-done", onHeroDone);
    } catch {}

    try {
      created.triggers.forEach((t) => t?.kill?.());
    } catch {}

    try {
      created.contexts.forEach((c) => c?.revert?.());
    } catch {}

    try {
      delete root.__revealInit;
      delete root.__revealCleanup;
    } catch {}

    try {
      ScrollTrigger.refresh(true);
    } catch {}
  };
}

function destroyScrollReveals(scope = document) {
  const root = getRoot(scope);
  try {
    root.__revealCleanup?.();
  } catch {}
  try {
    delete root.__revealCleanup;
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
        // Loader + Hero: overlap controllato (Hero parte mentre il loader sta uscendo)
        const scope = next?.container || document;
        const loaderEl = document.querySelector(".loader_wrap");

        // Se non c'è loader, mostra subito Hero e procedi coi refresh
        if (!loaderEl) {
          hideLoader(0).then(() => {
            playHeroIntro(scope, 0.1);
            refreshAfterEnter(0.05);
            refreshAfterEnter(0.25);
          });
        } else {
          const OVERLAP_DELAY = 0.3; // secondi: quanto dopo l'inizio dell'uscita parte la Hero

          const onExitStart = () => {
            document.removeEventListener("loader:exit-start", onExitStart);

            // Hero parte mentre il loader è ancora in uscita
            gsap.delayedCall(OVERLAP_DELAY, () => {
              playHeroIntro(scope, 0);
            });
          };

          document.addEventListener("loader:exit-start", onExitStart);

          hideLoader(3000).then(() => {
            // Refresh dopo che il loader è effettivamente rimosso
            refreshAfterEnter(0.05);
            refreshAfterEnter(0.25);
          });
        }

        preventSamePageClicks();
        initCustomCursor();
        initSignature();
        initDynamicYear(next?.container || document);
        initFormSuccessTransition(next?.container || document);
        initLenis();
        initMobileNavigation();
        unlockScroll();
        try {
          window.lenis?.start?.();
        } catch {}

        // const scope = next?.container || document; // (already defined above)
        initHeroIntro(scope);
        initScrollReveals(scope);
        initStopmotionSlideshow(scope, 3);
        initSwiperSliders(scope);
        initAccordions(scope);

        forceNextPageToTop();
        // refreshAfterEnter(0.05); // ora gestito in .then()
        // refreshAfterEnter(0.25); // ora gestito in .then()
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
        initFormSuccessTransition(next.container);
        initHeroIntro(next.container);
        initScrollReveals(next.container);
        initStopmotionSlideshow(next.container, 2);

        // removed refreshAfterEnter(0.01);

        const HERO_DELAY = 0.05; // Hero parte durante il fade-in del container

        return gsap.to(next.container, {
          delay: 0.15,
          autoAlpha: 1,
          duration: 1.25,
          ease: "power2.out",
          clearProps: "willChange",
          onStart: () => {
            // Hero parte DURANTE il fade-in del container
            playHeroIntro(next.container, HERO_DELAY);
          },
          onComplete: () => {
            refreshAfterEnter(0.05);
          },
        });
      },

      after({ current }) {
        unlockScroll();
        resumeLenis();
        initMobileNavigation();
        document.documentElement.classList.remove("is-transitioning");
        // Cleanup quando il current è già sparito, evita snap visibili prima della transizione
        destroySwiperSliders(current?.container || document);
        destroyAccordions(current?.container || document);
        destroyHeroIntro(current?.container || document);
        destroyScrollReveals(current?.container || document);

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


  barba.hooks.enter((data) => {
    initBarbaNavUpdate(data);
    if (typeof resetWebflow === "function") resetWebflow(data);
  });


  barba.hooks.beforeLeave(() => {
  });

  barba.hooks.afterEnter(() => {
    preventSamePageClicks();
    initFormSuccessTransition(document);
    initLenis();
    initDetectScrollingDirection();
    try {
      window.lenis?.scrollTo?.(window.scrollY || 0, { immediate: true });
    } catch {}

    refreshAfterEnter(0.12);
    refreshAfterEnter(0.35);
  });
}