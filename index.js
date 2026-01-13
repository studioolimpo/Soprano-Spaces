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
                opacity: 0,
                ease: "power2.out",
                overwrite: true,
              });
            } else if (direction === "up") {
              gsap.to(desktopNav, {
                yPercent: 0,
                opacity: 1,
                duration: 0.9,
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
    const SHIFT_OPEN_DURATION = 1.0;
    const SHIFT_CLOSE_DURATION = 0.9;
    const SHIFT_OPEN_EASE = "power2.out";
    const SHIFT_CLOSE_EASE = "power2.inOut";

    // Micro overlap: in chiusura il rientro parte leggermente dopo
    const SHIFT_CLOSE_DELAY = 0.12;

    const getStatus = () => navEl.getAttribute("data-navigation-status");
    const setStatus = (value) => navEl.setAttribute("data-navigation-status", value);


    // Durate tema (più lunghe, come richiesto)
    const THEME_OPEN_DURATION = 0.6;
    const THEME_CLOSE_DURATION = 0.45;
    const PANEL_CLOSE_DURATION = 1.0; // match CSS --panel-close (900ms)
    const PANEL_CLOSE_OPACITY_DELAY = 0.2; // opacity delay
    const THEME_RESET_OVERLAP = 0.55; // % della chiusura a cui iniziare il reset tema
    const THEME_EASE = "power3.out";

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

  // PERFORMANCE TUNING per frenata smooth come burro
  // lerp più alto = frenata più immediata, meno "coda" = zero scatti percepiti
  // Permetti override da HTML per tuning rapido:
  // <html data-lenis-lerp="0.08" data-lenis-wheel-mult="0.9">
  const lerpOverride = parseFloat(document.documentElement.getAttribute("data-lenis-lerp") || "");
  const wheelMultOverride = parseFloat(document.documentElement.getAttribute("data-lenis-wheel-mult") || "");

  // OTTIMIZZATO: lerp più bilanciato per frenata perfetta
  // 0.055 troppo basso = coda lunga = scatti
  // 0.08 = sweet spot: smooth ma frenata decisa
  const lerp = Number.isFinite(lerpOverride) ? lerpOverride : (isLuxury ? 0.08 : 0.12);
  const wheelMultiplier = Number.isFinite(wheelMultOverride) ? wheelMultOverride : (isLuxury ? 0.85 : 1);

  lenis = new Lenis({
    smoothWheel: true,
    smoothTouch: false,
    gestureOrientation: "vertical",
    wheelMultiplier,
    touchMultiplier: 1,
    lerp,
    // SMOOTH EASING: curva ottimizzata per frenata fluida
    // Evita micro-scatti alla fine della decelerazione
    easing: (t) => 1 - Math.pow(1 - t, 3), // cubic-out perfetto
    // Infinite scroll disabilitato per performance
    infinite: false,
  });

  window.lenis = lenis;

  // PERFORMANCE: ScrollTrigger update ottimizzato
  // Evita calcoli pesanti ad ogni frame durante scroll veloce
  if (typeof ScrollTrigger !== "undefined") {
    try {
      // RequestAnimationFrame throttling nativo di Lenis
      // ScrollTrigger.update viene chiamato solo quando necessario
      lenis.on("scroll", ScrollTrigger.update);

      // BONUS: disabilita ScrollTrigger "scrub" smoothing se presente
      // (Lenis fa già il lavoro, evita doppia interpolazione)
      ScrollTrigger.defaults({
        immediateRender: false,
      });
    } catch {}
  }

  _lenisRaf = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(_lenisRaf);

  // GSAP LAG SMOOTHING: CRITICO per frenata fluida
  // Quando il frame rate oscilla, GSAP compensa per evitare scatti
  // Permetti override da HTML: <html data-gsap-lag-threshold="500" data-gsap-lag-adjusted="33">
  const lagThreshold = parseFloat(document.documentElement.getAttribute("data-gsap-lag-threshold") || "");
  const lagAdjusted = parseFloat(document.documentElement.getAttribute("data-gsap-lag-adjusted") || "");

  if (Number.isFinite(lagThreshold) && Number.isFinite(lagAdjusted)) {
    gsap.ticker.lagSmoothing(lagThreshold, lagAdjusted);
  } else {
    // DEFAULT OTTIMIZZATO: valori calibrati per Lenis + animazioni GSAP
    // threshold: 500ms = se frame time > 500ms, attiva smoothing
    // adjustedLag: 33ms = compensa oscillazioni fino a ~30fps
    gsap.ticker.lagSmoothing(500, 33);
  }
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

  // IMPORTANTE: NON nascondere subito i messaggi nativi con !important
  // Webflow deve poterli mostrare per la detection, poi li nascondiamo noi
  function hideNativeMessagesAfterDetection($container) {
    $container.find(".w-form-done, .w-form-fail").each(function () {
      // Nascondi in modo soft (senza !important) così non blocca la detection
      this.style.opacity = "0";
      this.style.visibility = "hidden";
      this.style.position = "absolute";
      this.style.pointerEvents = "none";
      // NON usiamo display:none perché Webflow lo controlla
    });
  }

  // Mantieni l'altezza del form container per evitare scatti
  // IMPORTANTE: fixa TUTTA la sezione che contiene il form, non solo .w-form
  function freezeFormHeight($wForm) {
    // Trova la section parent che contiene il form
    const $section = $wForm.closest("section.u-section");
    const $formComponent = $wForm.closest(".form_component");

    // Fixa l'altezza della section intera (previene layout shift globale)
    if ($section.length) {
      const sectionHeight = $section.outerHeight();
      if (sectionHeight > 0) {
        $section.css({
          minHeight: sectionHeight + "px",
          transition: "none",
        });
      }
    }

    // Fixa anche il form_component wrapper
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

    // Fixa il .w-form stesso
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

    // 1) FIXA l'altezza per evitare scatti quando nascondiamo il form
    freezeFormHeight($wForm);

    // 2) Nascondi i messaggi nativi Webflow (DOPO detection)
    hideNativeMessagesAfterDetection($wForm);

    // 3) Mantieni il form visibile ma nascosto visualmente (evita cambio layout)
    $form.css({
      opacity: "0",
      pointerEvents: "none",
      visibility: "hidden",
    });

    const successSection = document.querySelector("#success-form");
    if (!successSection) {
      console.warn("[FORM SUCCESS] Pannello #success-form non trovato");
      return;
    }

    // 4) Mostra il pannello custom
    fadeInSuccess(successSection);

    const redirectUrl =
      successSection.getAttribute("data-success-redirect") || DEFAULT_REDIRECT_URL;

    const redirectDelay =
      Number(successSection.getAttribute("data-success-redirect-delay")) ||
      DEFAULT_REDIRECT_DELAY;

    // 5) Dopo il delay, naviga e dissolvi il pannello
    setTimeout(() => {
      navigateThenHideOverlay(redirectUrl, successSection);
    }, redirectDelay);
  }

  function waitForWebflowSuccess($form) {
    const $wForm = $form.closest(".w-form");
    const start = Date.now();

    // Check visibilità “fast” (no getBoundingClientRect). Usa getClientRects + offsetParent.
    const isVisibleFast = (el) => {
      if (!el) return false;
      try {
        // getClientRects() evita alcuni falsi positivi di offsetParent in casi particolari
        if (typeof el.getClientRects === "function" && el.getClientRects().length === 0) return false;
        // offsetParent null di solito indica display:none (o position:fixed con ancestor particolari)
        // quindi lo usiamo come euristica, ma non come unica.
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

      // Se Webflow mostra il fail, stop.
      if (isVisibleFast(failEl)) {
        console.log("[FORM] Errore rilevato, stop polling");
        return;
      }

      // ✅ SUCCESS REALMENTE AVVENUTO - Detection migliorata:
      // Opzione 1: Webflow ha mostrato .w-form-done (display: block)
      const doneVisible = isVisibleFast(doneEl);

      // Opzione 2: Webflow ha aggiunto style="display: block" inline su .w-form-done
      const doneStyleBlock = doneEl && doneEl.style.display === "block";

      // Opzione 3: Webflow ha nascosto il form
      const formHidden = formEl ? !isVisibleFast(formEl) : false;
      const formStyleNone = formEl && formEl.style.display === "none";

      // Success se: (done visibile O done ha display:block) E (form nascosto O form ha display:none)
      const successDetected = (doneVisible || doneStyleBlock) && (formHidden || formStyleNone);

      if (successDetected) {
        console.log("[FORM] Success rilevato! Mostro pannello custom");
        showSuccessAndRedirect($form);
        return;
      }

      if (Date.now() - start > DEFAULT_POLL_TIMEOUT) {
        console.warn("[FORM] Timeout polling, nessun success rilevato");
        return;
      }

      setTimeout(tick, POLL_EVERY);
    };

    // Piccolo delay: evita di leggere stati transitori immediatamente al submit
    setTimeout(tick, 120);
  }

  $forms.each(function () {
    const $form = $(this);
    if ($form.data("bound-success")) return;
    $form.data("bound-success", true);

    $form.on("submit", function () {
      const $wForm = $form.closest(".w-form");

      // 🔑 CRITICAL: Fixa le altezze IMMEDIATAMENTE al submit
      // Prima che Webflow faccia qualsiasi cambio al DOM
      freezeFormHeight($wForm);

      // NON nascondere i messaggi nativi subito - servono per la detection!
      // Li nascondiamo DOPO in showSuccessAndRedirect()
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
          console.log("[HERO] Hero intro complete, emitting hero:intro-done");
          document.dispatchEvent(new CustomEvent("hero:intro-done"));
        } catch {}
      });

      console.log(`[HERO] Playing hero intro with ${d}s delay`);
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

/**
 * SCROLL REVEALS - Sistema di animazioni per sezioni
 * =================================================
 *
 * Orchestrazione fluida: Loader → Hero → Scroll Reveals
 *
 * FLUSSO:
 * 1. Loader inizia ed esce (emette: loader:exit-start, loader:done)
 * 2. Hero parte durante l'uscita del loader (emette: hero:intro-start, hero:intro-done)
 * 3. ScrollReveals attende hero:intro-done per sbloccare le animazioni
 * 4. Sezioni above-the-fold: accodate e animate in sequenza dopo la hero
 * 5. Sezioni via scroll: animate con stagger globale quando entrano in viewport
 *
 * GRAMMATICHE ANIMATE:
 * - Elementi standard: fade + y translate (5px) + stagger 0.12s
 * - Slider cards: fade + blur (0.5rem → 0) + base delay 0.2s + stagger 0.2s
 * - Slider: trigger dedicato sullo slider stesso (non sulla sezione)
 *
 * COMPORTAMENTO:
 * - Desktop: animazioni coordinate con timing preciso e stagger visibile
 * - Mobile/Touch: animazioni immediate per UX ottimale su dispositivi touch
 * - Reduced motion: skip animazioni, elementi visibili immediatamente
 *
 * @param {Element|Document} scope - Scope in cui cercare le sezioni
 */
function initScrollReveals(scope = document) {
  // Richiede GSAP + ScrollTrigger
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  const root = getRoot(scope);

  // Evita doppia init nello stesso scope
  if (root.__revealInit === true) return;
  root.__revealInit = true;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Timing ottimizzato: concatenazione fluida loader → hero → scroll reveals
  // Stesso comportamento elegante su desktop E mobile
  const START_DELAY = 0.10; // micro-delay dopo hero:intro-done (leggermente più rapido)
  const QUEUE_STAGGER = 0.22; // stagger tra sezioni above-the-fold
  const SECTION_STAGGER_BETWEEN = 0.18; // stagger globale tra sezioni via scroll

  const created = {
    triggers: [],
    contexts: [],
  };

  const isInsideHero = (el) => !!el?.closest?.('[data-hero="wrap"]');
  // Memoization caches (performance)
  const __excludedCache = new WeakMap();
  const __absTopCache = new WeakMap();

  // Esclusioni globali (senza data-attributes) - Memoized
  const isExcluded = (el) => {
    if (!el) return true;

    // Fast path: memoized
    const cached = __excludedCache.get(el);
    if (cached !== undefined) return cached;

    let out = false;

    if (isInsideHero(el)) out = true;
    else if (el.closest("footer")) out = true;
    else if (el.closest(".nav_component, .nav_desktop_wrap, .nav_mobile_wrap")) out = true;
    else if (el.closest(".loader_wrap")) out = true;
    else if (el.getAttribute?.("data-reveal") === "false") out = true;

    __excludedCache.set(el, out);
    return out;
  };

  // PERFORMANCE: viewport check leggero usando ScrollTrigger nativo
  // Evita getBoundingClientRect() costoso durante init
  const isInViewport = (el, threshold = 0.1) => {
    if (!el) return false;

    // Usa ScrollTrigger.isInViewport se disponibile (molto più veloce)
    if (typeof ScrollTrigger !== "undefined" && typeof ScrollTrigger.isInViewport === "function") {
      return ScrollTrigger.isInViewport(el, threshold);
    }

    // Fallback: check rapido senza getBoundingClientRect
    // Usiamo offsetTop come proxy veloce
    try {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const vh = window.innerHeight || 0;
      const offsetTop = el.offsetTop || 0;

      return offsetTop < (scrollY + vh * (1 + threshold));
    } catch {
      return false;
    }
  };

  // PERFORMANCE: calcola una top position “document-based” senza getBoundingClientRect() (memoized)
  const getAbsoluteTop = (el) => {
    if (!el) return 0;

    const cached = __absTopCache.get(el);
    if (cached !== undefined) return cached;

    try {
      let top = 0;
      let node = el;
      while (node && node instanceof HTMLElement) {
        top += node.offsetTop || 0;
        node = node.offsetParent;
      }
      __absTopCache.set(el, top);
      return top;
    } catch {
      __absTopCache.set(el, 0);
      return 0;
    }
  };

  // Evita di pescare target dentro altre section annidate
  const isInSameSection = (node, section) => node?.closest?.("section.u-section") === section;

  // Collezione target affidabili in Lumos (NO display:contents)
  // Nota: escludiamo intenzionalmente `.u-display-contents` perché non è animabile.
  // PERF: invece di fare querySelectorAll per ogni section, raggruppiamo i candidati UNA volta per scope.
  const TARGET_SELECTORS = [
    ".u-content-wrapper",
    ".u-image-wrapper",
    ".slider_wrap",
    ".slideshow_wrap",
    ".accordion_wrap",
    ".u-button-wrapper",
  ];

  const collectSectionTargets = (section) => {
    if (!section || isExcluded(section)) return [];

    // Targets pre-raggruppati (se presenti)
    let targets = section.__revealTargets || [];

    // PERFORMANCE: filtra SOLO elementi veramente non animabili
    // NON filtrare opacity:0 o visibility:hidden inline - sono stati iniziali delle reveal!
    if (targets.length) {
      targets = targets.filter((el) => {
        try {
          if (!el || isExcluded(el)) return false;

          // ✅ Filtra solo display:none HARDCODED (non animabile)
          if (el.style.display === "none") return false;

          // ✅ Filtra classi nascoste permanenti (Webflow)
          if (el.hidden || el.classList?.contains("u-hidden")) return false;
          if (el.classList?.contains("w-condition-invisible")) return false;

          // ❌ NON filtrare visibility:hidden o opacity:0 inline
          // (sono gli stati iniziali che applichiamo noi per le reveal!)

          // ✅ Fallback leggero: offsetParent check
          // Ma skippa se ha position:fixed/absolute (possono avere offsetParent null)
          const position = el.style.position || "";
          if (el.offsetParent === null &&
              el.tagName !== "BODY" &&
              position !== "fixed" &&
              position !== "absolute") {
            return false;
          }

          return true;
        } catch {
          return true;
        }
      });
    }

    // Fallback: se non ci sono target pre-raggruppati, cerca nella section
    if (!targets.length) {
      // Prima prova: query diretta per i selettori target
      const found = Array.from(section.querySelectorAll(TARGET_SELECTORS.join(",")))
        .filter((el) => {
          if (!el || isExcluded(el)) return false;
          // NON filtrare visibility:hidden o opacity:0 inline (stati iniziali reveal!)
          if (el.style.display === "none") return false;
          if (el.hidden || el.classList?.contains("u-hidden")) return false;
          if (el.classList?.contains("w-condition-invisible")) return false;
          return true;
        })
        .filter((el) => isInSameSection(el, section));

      if (found.length) {
        targets = found;
      } else {
        // Ultima opzione: figli diretti del container (escludi spacer/background)
        const container = section.querySelector(":scope > .u-container") || section.querySelector(".u-container");
        if (container) {
          targets = Array.from(container.children || []).filter((el) => {
            if (!el || isExcluded(el)) return false;
            if (el.classList?.contains("u-section-spacer")) return false;
            if (el.classList?.contains("u-background-slot")) return false;
            return true;
          });
        }
      }
    }

    // Dedupe finale
    return targets && targets.length ? Array.from(new Set(targets)) : [];
  };

  // ---- GLOBAL SECTION SCHEDULER ----
  // Coordina le animazioni delle sezioni per evitare sovrapposizioni visuali.
  // Quando più sezioni dovrebbero animare contemporaneamente (scroll veloce, sezioni già visibili),
  // lo scheduler le mette in coda con uno stagger controllato.
  let nextSectionPlayAt = 0;

  const scheduleSectionPlay = (tl, extraDelay = 0) => {
    if (!tl) return;

    // Calcola il prossimo slot disponibile (desktop E mobile)
    const now = typeof gsap !== "undefined" && gsap.ticker ? gsap.ticker.time : 0;
    const startAt = Math.max(now, nextSectionPlayAt) + Math.max(0, Number(extraDelay) || 0);

    // Prenota lo slot successivo per la prossima sezione
    nextSectionPlayAt = startAt + SECTION_STAGGER_BETWEEN;

    const delay = Math.max(0, startAt - now);

    // Schedula l'animazione con safety check per evitare replay
    gsap.delayedCall(delay, () => {
      try {
        if (tl.isActive?.() || (typeof tl.progress === "function" && tl.progress() > 0)) return;
        tl.play(0);
      } catch {}
    });
  };

  // ---- UNLOCK GATE ----
  // Gestisce le sezioni above-the-fold (già visibili al caricamento).
  // Queste sezioni attendono che la hero finisca prima di animare (desktop E mobile).
  let unlocked = false;
  const aboveFoldQueue = []; // Array di { tl, top } - ordinato per posizione verticale

  const enqueueAboveFold = (tl, top) => {
    if (!tl) return;
    // Accoda per sincronizzazione con hero (desktop E mobile)
    aboveFoldQueue.push({ tl, top });
  };

  const flushAboveFoldQueue = () => {
    if (!aboveFoldQueue.length) return;

    // Ordina top -> bottom (le sezioni più in alto partono per prime)
    aboveFoldQueue.sort((a, b) => a.top - b.top);

    // Micro-delay dopo hero + stagger sequenziale (desktop E mobile)
    const base = START_DELAY;

    aboveFoldQueue.forEach((u, i) => {
      const tl = u?.tl;
      if (!tl) return;
      if (tl.isActive?.() || (typeof tl.progress === "function" && tl.progress() > 0)) return;

      // Applica stagger incrementale tra le sezioni above-the-fold
      const extra = base + i * QUEUE_STAGGER;
      scheduleSectionPlay(tl, extra);
    });

    aboveFoldQueue.length = 0;
  };

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;

    console.log(`[REVEAL] Unlocked! Processing ${aboveFoldQueue.length} queued sections`);

    // Reset dello scheduler globale: le sezioni partono da un timing pulito dopo la hero
    nextSectionPlayAt = typeof gsap !== "undefined" && gsap.ticker ? gsap.ticker.time : 0;

    // Svuota la coda delle sezioni above-the-fold con timing coordinato
    flushAboveFoldQueue();
  };

  const onHeroDone = () => {
    console.log("[REVEAL] Received hero:intro-done event");
    document.removeEventListener("hero:intro-done", onHeroDone);
    unlock();
  };

  // Sincronizzazione con hero: attende l'evento hero:intro-done
  // Se la hero non esiste, l'evento viene comunque emesso da playHeroIntro()
  document.addEventListener("hero:intro-done", onHeroDone);

  // 🔑 SAFETY UNLOCK: se non c'è hero o l'evento non arriva, sblocca automaticamente
  // Controlla se esiste una hero nella pagina
  const hasHero = !!root.querySelector('[data-hero="wrap"], #hero-home, [data-anim="hero"], [data-anim="hero-home"]');

  if (!hasHero) {
    // Nessuna hero: SIMULA l'evento hero:intro-done con timing realistico
    // Questo permette alle sezioni above-fold di accodarsi correttamente,
    // poi partono con lo stagger elegante come se ci fosse stata una hero
    const SIMULATED_HERO_DURATION = 0.8; // simula: 0.1s delay + 0.7s hero duration
    gsap.delayedCall(SIMULATED_HERO_DURATION, () => {
      if (!unlocked) {
        console.log("[REVEAL] Nessuna hero rilevata, emetto hero:intro-done simulato");
        try {
          document.dispatchEvent(new CustomEvent("hero:intro-done"));
        } catch {}
        // unlock() verrà chiamato automaticamente dal listener onHeroDone
      }
    });
  } else {
    // Hero presente: safety timeout se l'evento non arriva (fallback)
    const SAFETY_UNLOCK_SEC = 3.5; // 3.5 secondi massimo di attesa
    gsap.delayedCall(SAFETY_UNLOCK_SEC, () => {
      if (!unlocked) {
        console.warn("[REVEAL] Timeout hero, unlock forzato per sicurezza");
        unlock();
      }
    });
  }

  // ---- FACTORY SLIDER: grammatica dedicata per card slider ----
  // Ottimizzato: blur solo sulle prime 4 card per performance, resto fade only
  const makeSliderRevealTl = (slider) => {
    if (!slider) return null;

    // Rimuovi eventuali CSS animations conflittuali
    try {
      const cssAnimator = slider.querySelector('[data-css-animator]');
      if (cssAnimator) cssAnimator.remove();
    } catch {}

    // Trova le card
    const cards = Array.from(
      slider.querySelectorAll(".slider_list > .card_primary_wrap, .slider_list .swiper-slide > .card_primary_wrap")
    );

    if (!cards.length) return null;

    if (reduceMotion) {
      gsap.set(cards, { autoAlpha: 1, clearProps: "filter" });
      return null;
    }

    // PERFORMANCE: separa card con blur (prime 4) da quelle senza (resto)
    const cardsWithBlur = cards.slice(0, 4);
    const cardsWithoutBlur = cards.slice(4);

    // Stato iniziale - card con blur
    if (cardsWithBlur.length) {
      gsap.set(cardsWithBlur, {
        autoAlpha: 0,
        filter: "blur(0.5rem)",
        willChange: "opacity, filter",
      });
    }

    // Stato iniziale - card senza blur (solo fade)
    if (cardsWithoutBlur.length) {
      gsap.set(cardsWithoutBlur, {
        autoAlpha: 0,
        // PERFORMANCE: evita will-change su molte card (costa memoria e può peggiorare lo scroll)
      });
    }

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        cards.forEach((card) => {
          try {
            card.style.willChange = "";
            // PERFORMANCE: libera il layer/filter dopo il reveal
            card.style.filter = "";
          } catch {}
        });
      },
    });

    // Animazione - TUTTE le card insieme con stagger, ma blur solo sulle prime 4
    tl.to(
      cardsWithBlur,
      {
        duration: 0.9,
        autoAlpha: 1,
        filter: "blur(0rem)",
        ease: "power2.inOut",
        stagger: {
          each: 0.2,
          from: "start",
        },
        delay: 0.2,
        immediateRender: false,
      },
      0
    );

    // Card senza blur: solo fade, stesso timing
    if (cardsWithoutBlur.length) {
      tl.to(
        cardsWithoutBlur,
        {
          duration: 0.9,
          autoAlpha: 1,
          ease: "power2.inOut",
          stagger: {
            each: 0.2,
            from: "start",
          },
          delay: 0.2 + cardsWithBlur.length * 0.2, // continua dopo le prime 4
          immediateRender: false,
        },
        0
      );
    }

    return tl;
  };

  // ---- FACTORY: grammatica coerente (fade + y + stagger) ----
  const makeSectionRevealTl = (targets) => {
    if (!targets || !targets.length) return null;

    if (reduceMotion) {
      gsap.set(targets, { autoAlpha: 1, clearProps: "transform" });
      return null;
    }

    // Stato iniziale
    gsap.set(targets, {
      autoAlpha: 0,
      y: 5,
      willChange: "opacity, transform",
    });

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "power2.out" },
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

  const sections = Array.from(root.querySelectorAll("section.u-section")).filter((s) => !isExcluded(s));
  console.log(`[REVEAL] Found ${sections.length} sections with class .u-section`);
  if (!sections.length) return;

  // PERF: pre-raggruppa i candidati una sola volta per scope, poi assegnali alla section corretta.
  // Questo evita N querySelectorAll per N sezioni.
  const sectionsSet = new Set(sections);

  // Pulisci eventuali target precedenti (Barba re-enter) per evitare accumuli
  sections.forEach((s) => {
    try {
      delete s.__revealTargets;
    } catch {}
  });

  const allCandidates = Array.from(root.querySelectorAll(TARGET_SELECTORS.join(",")));
  allCandidates.forEach((el) => {
    if (!el) return;

    const section = el.closest("section.u-section");
    if (!section) return;
    if (!sectionsSet.has(section)) return;
    if (isExcluded(section) || isExcluded(el)) return;

    // Manteniamo la guardia su nested sections
    if (!isInSameSection(el, section)) return;

    // Inizializza bucket
    if (!section.__revealTargets) section.__revealTargets = [];
    section.__revealTargets.push(el);
  });

  // Dedupe per section (preserva ordine DOM)
  sections.forEach((s) => {
    if (!s.__revealTargets || !s.__revealTargets.length) return;
    const seen = new Set();
    s.__revealTargets = s.__revealTargets.filter((el) => {
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    });
  });

  const ctx = gsap.context(() => {
    sections.forEach((section, idx) => {
      const targets = collectSectionTargets(section);

      // DEBUG: identificazione sezione
      const sectionName = section.getAttribute("data-name") || section.id || `section-${idx}`;
      console.log(`[REVEAL] Processing: ${sectionName}, targets=${targets.length}`);

      // Separa slider da altri target
      const sliders = targets.filter((t) => t.classList?.contains("slider_wrap") || t.hasAttribute?.("data-slider"));
      const nonSliders = targets.filter((t) => !sliders.includes(t));

      if (targets.length) {
        console.log(`[REVEAL] → ${sectionName}: sliders=${sliders.length}, nonSliders=${nonSliders.length}`);
      }

      // ---- GESTIONE SLIDER (con trigger dedicato) ----
      sliders.forEach((slider) => {
        const sliderTl = makeSliderRevealTl(slider);
        if (!sliderTl) return;

        // Pre-check above-the-fold
        if (isInViewport(slider, 0.08) && !unlocked) {
          // PERFORMANCE: evita getBoundingClientRect durante init
          enqueueAboveFold(sliderTl, getAbsoluteTop(slider));
        }

        // ScrollTrigger: usa lo SLIDER come trigger (non la sezione)
        const sliderST = ScrollTrigger.create({
          trigger: slider,
          start: "top 85%",
          once: true,
          onEnter: () => {
            if (sliderTl.isActive?.() || (typeof sliderTl.progress === "function" && sliderTl.progress() > 0)) return;

            if (!unlocked && isInViewport(slider, 0.08)) {
              enqueueAboveFold(sliderTl, getAbsoluteTop(slider));
              return;
            }

            scheduleSectionPlay(sliderTl, 0);
          },
        });

        created.triggers.push(sliderST);
      });

      // ---- GESTIONE ALTRI TARGET (con trigger sezione) ----
      if (nonSliders.length) {
        const tl = makeSectionRevealTl(nonSliders);
        if (!tl) {
          console.warn(`[REVEAL] ${sectionName}: timeline creation failed for nonSliders`);
          return;
        }

        console.log(`[REVEAL] ${sectionName}: timeline created for ${nonSliders.length} targets`);

        // Pre-check: se la sezione è above-the-fold e l'unlock non è ancora avvenuto,
        // accodala immediatamente per la sincronizzazione con la hero
        const isAboveFold = isInViewport(section, 0.08);
        if (isAboveFold && !unlocked) {
          console.log(`[REVEAL] ${sectionName}: above-fold, queued for hero sync`);
          enqueueAboveFold(tl, getAbsoluteTop(section));
        }

        // ScrollTrigger: gestisce le sezioni che entrano in viewport durante lo scroll
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top 85%",
          once: true,
          onEnter: () => {
            console.log(`[REVEAL] ${sectionName}: ScrollTrigger fired, unlocked=${unlocked}`);

            // Safety: previene replay accidentali
            if (tl.isActive?.() || (typeof tl.progress === "function" && tl.progress() > 0)) {
              console.log(`[REVEAL] ${sectionName}: skipped (already playing/played)`);
              return;
            }

            // Se la sezione è above-the-fold ma la hero non ha ancora finito,
            // accodala per la sincronizzazione (caso edge: resize, scroll prima che hero finisca)
            if (!unlocked && isInViewport(section, 0.08)) {
              console.log(`[REVEAL] ${sectionName}: late queue (hero not done)`);
              enqueueAboveFold(tl, getAbsoluteTop(section));
              return;
            }

            // Caso normale: sezione entra via scroll → usa lo scheduler globale
            console.log(`[REVEAL] ${sectionName}: scheduling play`);
            scheduleSectionPlay(tl, 0);
          },
        });

        created.triggers.push(st);
      }
    });
  }, root);

  created.contexts.push(ctx);

  // Cleanup Barba-safe
  root.__revealCleanup = () => {
    try {
      document.removeEventListener("hero:intro-done", onHeroDone);
    } catch {}

    try {
      // PERF: pulisci i bucket targets sulle sezioni per non trattenere riferimenti tra pagine
      root.querySelectorAll("section.u-section").forEach((s) => {
        try {
          delete s.__revealTargets;
        } catch {}
      });
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