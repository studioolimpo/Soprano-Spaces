function debounce(e, t) {
  let a;
  return function (...r) {
    (clearTimeout(a), (a = setTimeout(() => e.apply(this, r), t)));
  };
}
function supportsTouch() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function initBarbaNavUpdate(e) {
  const t = $(e.next.html).find('[data-barba-update="nav"]');
  $('[data-barba-update="nav"]').each(function (e) {
    const a = $(t[e]);
    if (a.length) {
      const e = a.attr("aria-current");
      void 0 !== e
        ? $(this).attr("aria-current", e)
        : $(this).removeAttr("aria-current");
      const t = a.attr("class");
      $(this).attr("class", t);
    }
  });
}
function horizontalLoop(e, t) {
  let a;
  return (
    (e = gsap.utils.toArray(e)),
    (t = t || {}),
    gsap.context(() => {
      function r(e, t) {
        ((t = t || {}), Math.abs(e - f) > c / 2 && (e += e > f ? -c : c));
        let a = gsap.utils.wrap(0, c, e),
          r = p[a];
        return (
          r > d.time() != e > f &&
            e !== f &&
            (r += d.duration() * (e > f ? 1 : -1)),
          (r < 0 || r > d.duration()) && (t.modifiers = { time: n }),
          (f = a),
          (t.overwrite = !0),
          gsap.killTweensOf(i),
          0 === t.duration ? d.time(n(r)) : d.tweenTo(r, t)
        );
      }
      let o,
        n,
        i,
        s = t.onChange,
        l = 0,
        d = gsap.timeline({
          repeat: t.repeat,
          onUpdate:
            s &&
            function () {
              let t = d.closestIndex();
              l !== t && ((l = t), s(e[t], t));
            },
          paused: t.paused,
          defaults: { ease: "none" },
          onReverseComplete: () =>
            d.totalTime(d.rawTime() + 100 * d.duration()),
        }),
        c = e.length,
        u = e[0].offsetLeft,
        p = [],
        g = [],
        m = [],
        h = [],
        f = 0,
        b = !1,
        y = t.center,
        v = 100 * (t.speed || 1),
        w = !1 === t.snap ? (e) => e : gsap.utils.snap(t.snap || 1),
        A = 0,
        x =
          !0 === y
            ? e[0].parentNode
            : gsap.utils.toArray(y)[0] || e[0].parentNode,
        S = () => {
          let a,
            r = x.getBoundingClientRect();
          (e.forEach((e, t) => {
            ((g[t] = parseFloat(gsap.getProperty(e, "width", "px"))),
              (h[t] = w(
                (parseFloat(gsap.getProperty(e, "x", "px")) / g[t]) * 100 +
                  gsap.getProperty(e, "xPercent"),
              )),
              (a = e.getBoundingClientRect()),
              (m[t] = a.left - (t ? r.right : r.left)),
              (r = a));
          }),
            gsap.set(e, { xPercent: (e) => h[e] }),
            (o =
              e[c - 1].offsetLeft +
              (h[c - 1] / 100) * g[c - 1] -
              u +
              m[0] +
              e[c - 1].offsetWidth * gsap.getProperty(e[c - 1], "scaleX") +
              (parseFloat(t.paddingRight) || 0)));
        },
        E = () => {
          ((A = y ? (d.duration() * (x.offsetWidth / 2)) / o : 0),
            y &&
              p.forEach((e, t) => {
                p[t] = n(
                  d.labels["label" + t] + (d.duration() * g[t]) / 2 / o - A,
                );
              }));
        },
        q = (e, t, a) => {
          let r,
            o = e.length,
            n = 1e10,
            i = 0;
          for (; o--; )
            ((r = Math.abs(e[o] - t)),
              r > a / 2 && (r = a - r),
              r < n && ((n = r), (i = o)));
          return i;
        },
        L = () => {
          let t, a, r, i, s;
          for (d.clear(), t = 0; t < c; t++)
            ((a = e[t]),
              (r = (h[t] / 100) * g[t]),
              (i = a.offsetLeft + r - u + m[0]),
              (s = i + g[t] * gsap.getProperty(a, "scaleX")),
              d
                .to(
                  a,
                  { xPercent: w(((r - s) / g[t]) * 100), duration: s / v },
                  0,
                )
                .fromTo(
                  a,
                  { xPercent: w(((r - s + o) / g[t]) * 100) },
                  {
                    xPercent: h[t],
                    duration: (r - s + o - r) / v,
                    immediateRender: !1,
                  },
                  s / v,
                )
                .add("label" + t, i / v),
              (p[t] = i / v));
          n = gsap.utils.wrap(0, d.duration());
        },
        T = (e) => {
          let t = d.progress();
          (d.progress(0, !0),
            S(),
            e && L(),
            E(),
            e && d.draggable ? d.time(p[f], !0) : d.progress(t, !0));
        },
        P = () => T(!0);
      if (
        (gsap.set(e, { x: 0 }),
        S(),
        L(),
        E(),
        window.addEventListener("resize", P),
        (d.toIndex = (e, t) => r(e, t)),
        (d.closestIndex = (e) => {
          let t = q(p, d.time(), d.duration());
          return (e && ((f = t), (b = !1)), t);
        }),
        (d.current = () => (b ? d.closestIndex(!0) : f)),
        (d.next = (e) => r(d.current() + 1, e)),
        (d.previous = (e) => r(d.current() - 1, e)),
        (d.times = p),
        d.progress(1, !0).progress(0, !0),
        t.reversed && (d.vars.onReverseComplete(), d.reverse()),
        t.draggable && "function" == typeof Draggable)
      ) {
        i = document.createElement("div");
        let t,
          a,
          r,
          s,
          l,
          c,
          u = gsap.utils.wrap(0, 1),
          g = () => d.progress(u(a + (r.startX - r.x) * t)),
          m = () => d.closestIndex(!0);
        ((r = Draggable.create(i, {
          trigger: e[0].parentNode,
          type: "x",
          onPressInit() {
            let e = this.x;
            (gsap.killTweensOf(d),
              (c = !d.paused()),
              d.pause(),
              (a = d.progress()),
              T(),
              (t = 1 / o),
              (l = a / -t - e),
              gsap.set(i, { x: a / -t }));
          },
          onDrag: g,
          onThrowUpdate: g,
          overshootTolerance: 0,
          inertia: !0,
          snap(e) {
            if (Math.abs(a / -t - this.x) < 10) return s + l;
            let r = -e * t * d.duration(),
              o = n(r),
              i = p[q(p, o, d.duration())] - o;
            return (
              Math.abs(i) > d.duration() / 2 &&
                (i += i < 0 ? d.duration() : -d.duration()),
              (s = (r + i) / d.duration() / -t),
              s
            );
          },
          onRelease() {
            (m(), r.isThrowing && (b = !0));
          },
          onThrowComplete: () => {
            (m(), c && d.play());
          },
        })[0]),
          (d.draggable = r));
      }
      return (
        d.closestIndex(!0),
        (l = f),
        s && s(e[f], f),
        (a = d),
        () => window.removeEventListener("resize", P)
      );
    }),
    a
  );
}
function initLenis() {
  ((lenis = new Lenis({ lerp: 0.12 })),
    lenis.on("scroll", ScrollTrigger.update),
    gsap.ticker.add((e) => {
      lenis.raf(1e3 * e);
    }),
    gsap.ticker.lagSmoothing(0));
}
function updateDownloadCTA(e) {
  const t = navigator.userAgent,
    a = /Android/i.test(t),
    r = /iPhone|iPad|iPod/i.test(t),
    o = (t, a, r) => {
      e.querySelectorAll('[data-download-cta="button"]').forEach((e) => {
        e.href = r;
        const o = e.querySelector('[data-download-cta="text"]');
        o && (o.textContent = a);
        const n = e.querySelector('[data-download-cta="logo"]');
        if (n && icons[t]) {
          n.innerHTML = "";
          const e = document.createElement("img");
          ((e.src = icons[t]), (e.alt = t + " icon"), n.appendChild(e));
        }
      });
    };
  if (a)
    return void o(
      "android",
      "Download for Android",
      "https://play.google.com/store/apps/details?id=com.mystenlabs.suiwallet",
    );
  if (r)
    return void o(
      "ios",
      "Download for iOS",
      "https://apps.apple.com/us/app/slush-wallet/id6476572140",
    );
  const n = () => {
    let a, r, n;
    if (/Edg/i.test(t))
      ((a = "edge"),
        (r = "Download for Edge"),
        (n =
          "https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"));
    else if (/Chrome/i.test(t))
      ((a = "chrome"),
        (r = "Download for Chrome"),
        (n =
          "https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"));
    else {
      if (!/Arc/i.test(t))
        return void (
          e.parentElement && e.parentElement.classList.add("not-available")
        );
      ((a = "arc"),
        (r = "Download for Arc"),
        (n =
          "https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"));
    }
    o(a, r, n);
  };
  navigator.brave && "function" == typeof navigator.brave.isBrave
    ? navigator.brave.isBrave().then((e) => {
        e
          ? o(
              "brave",
              "Download for Brave",
              "https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil",
            )
          : n();
      })
    : n();
}
function initCursor() {
  let e = document.querySelector(".cursor"),
    t = (e.querySelector("p"), !1);
  gsap.set(e, { xPercent: 6, yPercent: 50 });
  let a = gsap.quickTo(e, "x", { ease: "power3" }),
    r = gsap.quickTo(e, "y", { ease: "power3" });
  window.addEventListener("mousemove", (o) => {
    let n = window.innerWidth,
      i = window.innerHeight,
      s = window.scrollY,
      l = o.clientX,
      d = o.clientY + s,
      c = 6,
      u = 50;
    (l > n - (e.offsetWidth + 16) ? ((t = !0), (c = -100)) : (t = !1),
      d > s + 0.9 * i && (u = -120),
      gsap.to(e, { xPercent: c, yPercent: u, duration: 0.9, ease: "power3" }),
      a(l),
      r(d - s));
  });
}
function initCursorTargets(e) {
  let t = e.querySelectorAll("[data-cursor]"),
    a = document.querySelector(".cursor"),
    r = a.querySelector("p"),
    o = "";
  0 !== t.length &&
    t.forEach((e) => {
      e.addEventListener("mouseenter", () => {
        let t = e.getAttribute("data-cursor");
        t !== o && ((r.innerHTML = t), (o = t), a.offsetWidth);
      });
    });
}
function initDetectScrollingDirection() {
  let e = 0;
  const t = gsap.matchMedia(),
    a = document.querySelectorAll(".nav-inner-li");
  t.add(
    { isDesktop: "(min-width: 992px)", isMobile: "(max-width: 991px)" },
    (t) => {
      window.addEventListener("scroll", () => {
        const r = window.scrollY;
        if (Math.abs(r - e) < 10) return;
        const o = r > e ? "down" : "up",
          n = r > 50;
        ((e = r),
          document.body.setAttribute("data-scrolling-direction", o),
          document.body.setAttribute("data-scrolling-started", n),
          "down" === o && n
            ? t.conditions.isDesktop &&
              gsap.to(a, {
                yPercent: -300,
                duration: 0.75,
                ease: "slush-bounce",
                stagger: { each: 0.03, from: "start" },
              })
            : "up" === o &&
              t.conditions.isDesktop &&
              gsap.to(a, {
                yPercent: 0,
                duration: 0.75,
                ease: "slush-bounce",
                stagger: { each: 0.03, from: "end" },
              }));
      });
    },
  );
}
function initFooter(e) {
  const t = setInterval(() => {
    const a = e.querySelector("iframe");
    if (a && a.contentWindow.document.querySelector('input[type="submit"]')) {
      clearInterval(t);
      let e = document.getElementById("email-form"),
        r = document.getElementById("success-message");
      const o = document.getElementById("email"),
        n = document.getElementById("Agreement"),
        i = document.getElementById("submit-static-form"),
        s = a.contentWindow.document,
        l = s.querySelector('input[name="email"]'),
        d = s.querySelector(
          'input[name="LEGAL_CONSENT.subscription_type_73527468"]',
        ),
        c = s.querySelector('input[type="submit"]');
      (o &&
        l &&
        o.addEventListener("input", (e) => {
          l.value = e.target.value;
          const t = new Event("input", { bubbles: !0 });
          l.dispatchEvent(t);
        }),
        n &&
          d &&
          n.addEventListener("change", (e) => {
            e.target.checked !== d.checked && d.click();
          }),
        i &&
          c &&
          i.addEventListener("click", (t) => {
            (t.preventDefault(),
              o.value.trim() &&
                n.checked &&
                (c.click(),
                (e.style.display = "none"),
                (r.style.display = "block")));
          }));
    }
  }, 100);
}
function initMenu() {
  const e = document.querySelector("#menuButton");
  if (!e) return;
  const t = document.querySelectorAll(".nav-inner-li"),
    a = document.querySelector(".nav-inner-right"),
    r = e.querySelector(".nav-btn-menu__line.is--h"),
    o = gsap.matchMedia();
  (o.add("(min-width: 992px)", () => {
    const r = () => {
        gsap.to(t, {
          yPercent: 0,
          duration: 0.75,
          ease: "slush-bounce",
          stagger: { each: 0.03, from: "end" },
        });
      },
      o = () => {
        gsap.to(t, {
          yPercent: -300,
          duration: 0.75,
          ease: "slush-bounce",
          stagger: { each: 0.03, from: "start" },
        });
      };
    return (
      e.addEventListener("mouseenter", r, { passive: !0 }),
      a.addEventListener("mouseleave", o, { passive: !0 }),
      () => {
        (e.removeEventListener("mouseenter", r, { passive: !0 }),
          a.removeEventListener("mouseleave", o, { passive: !0 }));
      }
    );
  }),
    o.add("(max-width: 991px)", () => {
      gsap.set(t, { xPercent: 300, yPercent: 0 });
      const a = () => {
        menuState
          ? (gsap.to(t, {
              xPercent: 300,
              duration: 0.75,
              ease: "slush-bounce",
              stagger: { each: 0.03, from: "start" },
            }),
            (e.style.transform = "rotate(0deg)"),
            (r.style.transform = "scaleX(1)"),
            (menuState = !1))
          : (gsap.to(t, {
              xPercent: 0,
              duration: 0.75,
              ease: "slush-bounce",
              stagger: { each: 0.03, from: "end" },
            }),
            (e.style.transform = "rotate(90deg)"),
            (r.style.transform = "scaleX(0)"),
            (menuState = !0));
      };
      return (
        e.addEventListener("click", a),
        () => {
          e.removeEventListener("click", a);
        }
      );
    }));
}
function initSliders(e) {
  gsap
    .matchMedia()
    .add(
      { isMobile: "(max-width: 767px)", isDesktop: "(min-width: 768px)" },
      (t) => {
        const { isMobile: a } = t.conditions,
          r = gsap.utils
            .toArray(e.querySelectorAll('[data-centered-slider="wrapper"]'))
            .map((e) => {
              function t() {
                if (p > 0 && !l) {
                  const e = () => {
                    (g.next({ ease: "slush-bounce", duration: 0.725 }),
                      (l = gsap.delayedCall(p, e)));
                  };
                  l = gsap.delayedCall(p, e);
                }
              }
              function r() {
                (l?.kill(), (l = null));
              }
              if (e.hasAttribute("data-init-mobile") && !a) return null;
              const o = gsap.utils.toArray(
                  e.querySelectorAll('[data-centered-slider="slide"]'),
                ),
                n = gsap.utils.toArray(
                  e.querySelectorAll('[data-centered-slider="bullet"]'),
                ),
                i = e.querySelector('[data-centered-slider="prev-button"]'),
                s = e.querySelector('[data-centered-slider="next-button"]');
              let l,
                d,
                c,
                u = 0;
              const p =
                ("true" === e.getAttribute("data-slider-autoplay") &&
                  parseFloat(
                    e.getAttribute("data-slider-autoplay-duration"),
                  )) ||
                0;
              (o.forEach((e, t) => (e.id = `slide-${t}`)),
                n.forEach((e, t) => {
                  (e.setAttribute("aria-controls", `slide-${t}`),
                    e.setAttribute(
                      "aria-selected",
                      0 === t ? "true" : "false",
                    ));
                }));
              const g = horizontalLoop(o, {
                paused: !0,
                draggable: !0,
                center: !0,
                onChange: (e, t) => {
                  ((u = t),
                    d?.classList.remove("active"),
                    e.classList.add("active"),
                    (d = e),
                    n.length &&
                      (c?.classList.remove("active"),
                      n[t].classList.add("active"),
                      (c = n[t]),
                      n.forEach((e, a) =>
                        e.setAttribute(
                          "aria-selected",
                          a === t ? "true" : "false",
                        ),
                      )));
                },
              });
              g.toIndex(0, { duration: 0.01 });
              const m = ScrollTrigger.create({
                trigger: e,
                start: "top bottom",
                end: "bottom top",
                onEnter: t,
                onLeave: r,
                onEnterBack: t,
                onLeaveBack: r,
              });
              return (
                e.addEventListener("mouseenter", r),
                e.addEventListener("mouseleave", () => {
                  ScrollTrigger.isInViewport(e) && t();
                }),
                o.forEach((e, t) =>
                  e.addEventListener("click", () =>
                    g.toIndex(t, { ease: "slush-bounce", duration: 0.725 }),
                  ),
                ),
                n.forEach((e, t) =>
                  e.addEventListener("click", () => {
                    (g.toIndex(t, { ease: "slush-bounce", duration: 0.725 }),
                      c?.classList.remove("active"),
                      e.classList.add("active"),
                      (c = e),
                      n.forEach((e, a) =>
                        e.setAttribute(
                          "aria-selected",
                          a === t ? "true" : "false",
                        ),
                      ));
                  }),
                ),
                i?.addEventListener("click", () => {
                  const e = (u - 1 + o.length) % o.length;
                  g.toIndex(e, { ease: "slush-bounce", duration: 0.725 });
                }),
                s?.addEventListener("click", () => {
                  const e = (u + 1) % o.length;
                  g.toIndex(e, { ease: "slush-bounce", duration: 0.725 });
                }),
                () => {
                  (m.kill(), r(), ScrollTrigger.refresh());
                }
              );
            })
            .filter(Boolean);
        return () => r.forEach((e) => e());
      },
    );
}
function initMarqueeScrollDirection(e) {
  e.querySelectorAll("[data-marquee-scroll-direction-target]").forEach((e) => {
    const t = e.querySelector("[data-marquee-collection-target]"),
      a = e.querySelector("[data-marquee-scroll-target]");
    if (!t || !a) return;
    const {
        marqueeSpeed: r,
        marqueeDirection: o,
        marqueeDuplicate: n,
        marqueeScrollSpeed: i,
      } = e.dataset,
      s = parseFloat(r),
      l = "right" === o ? 1 : -1,
      d = parseInt(n || 0),
      c = parseFloat(i);
    let u = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1,
      p = s * (t.offsetWidth / window.innerWidth) * u;
    if (
      (MM.add(
        {
          isDesktop: `(min-width: ${BREAKPOINT}px)`,
          isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (e) => {
          let { isDesktop: t, isMobile: a, reduceMotion: r } = e.conditions;
          r && ((p = 100), (u = 0));
        },
      ),
      (a.style.marginLeft = -1 * c + "%"),
      (a.style.width = 2 * c + 100 + "%"),
      d > 0)
    ) {
      const e = document.createDocumentFragment();
      for (let a = 0; a < d; a++) e.appendChild(t.cloneNode(!0));
      a.appendChild(e);
    }
    const g = e.querySelectorAll("[data-marquee-collection-target]"),
      m = gsap
        .to(g, { xPercent: -100, repeat: -1, duration: p, ease: "linear" })
        .totalProgress(0.5);
    (gsap.set(g, { xPercent: 1 === l ? 100 : -100 }),
      m.timeScale(l),
      m.play(),
      e.setAttribute("data-marquee-status", "normal"),
      ScrollTrigger.create({
        trigger: e,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (t) => {
          const a = 1 === t.direction,
            r = a ? -l : l;
          (m.timeScale(r),
            e.setAttribute("data-marquee-status", a ? "normal" : "inverted"));
        },
      }));
    const h = gsap.timeline({
        scrollTrigger: {
          trigger: e,
          start: "0% 100%",
          end: "100% 0%",
          scrub: 0,
        },
      }),
      f = -1 === l ? c : -c,
      b = -f;
    h.fromTo(a, { x: `${f}vw` }, { x: `${b}vw`, ease: "none" });
  });
}
function initVerticalMarqueeScrollDirection(e) {
  e.querySelectorAll("[data-marquee-scroll-vertical]").forEach((e) => {
    const t = e.querySelector("[data-marquee-collection-target]"),
      a = e.querySelector("[data-marquee-scroll-target]");
    if (!t || !a) return;
    const {
        marqueeSpeed: r,
        marqueeDirection: o,
        marqueeDuplicate: n,
        marqueeScrollSpeed: i,
      } = e.dataset,
      s = parseFloat(r),
      l = "down" === o ? 1 : -1,
      d = parseInt(n || 0),
      c = parseFloat(i),
      u = window.innerHeight < 479 ? 0.25 : window.innerHeight < 991 ? 0.5 : 1;
    let p = s * (t.offsetHeight / window.innerHeight) * u;
    if (
      ((a.style.marginTop = -1 * c + "%"),
      (a.style.height = 2 * c + 100 + "%"),
      d > 0)
    ) {
      const e = document.createDocumentFragment();
      for (let a = 0; a < d; a++) e.appendChild(t.cloneNode(!0));
      a.appendChild(e);
    }
    const g = e.querySelectorAll("[data-marquee-collection-target]"),
      m = gsap
        .to(g, { yPercent: -100, repeat: -1, duration: p, ease: "linear" })
        .totalProgress(0.5);
    (gsap.set(g, { yPercent: 1 === l ? 100 : -100 }),
      m.timeScale(l),
      m.play(),
      e.setAttribute("data-marquee-status", "normal"));
    const h = -1 === l ? c : -c,
      f = -h;
    gsap
      .timeline({
        scrollTrigger: {
          trigger: e,
          start: "0% 100%",
          end: "100% 0%",
          scrub: 0,
        },
      })
      .fromTo(a, { y: `${h}vh` }, { y: `${f}vh`, ease: "none" });
  });
}
function initTabSystem(e) {
  e.querySelectorAll('[data-tabs="wrapper"]').forEach((e) => {
    function t(t) {
      if (u || a[t] === l) return;
      u = !0;
      const n = e.querySelector(".tab-content__text-wrap"),
        i = l,
        s = d,
        p = c,
        g = a[t],
        m = r[t],
        h = o[t],
        f = h.getBoundingClientRect().height;
      gsap.to(n, { height: f });
      const b = h.getAttribute("data-visual-bg");
      (i?.classList.remove("active"),
        s?.classList.remove("active"),
        p?.classList.remove("active"),
        g.classList.add("active"),
        m.classList.add("active"),
        h.classList.add("active"));
      const y = gsap.timeline({
        defaults: { duration: 0.65, ease: "slush" },
        onComplete: () => {
          ((l = g), (d = m), (c = h), (u = !1));
        },
      });
      (i &&
        (i.classList.remove("active"),
        s?.classList.remove("active"),
        p?.classList.remove("active"),
        y
          .to(s, { autoAlpha: 0, yPercent: 10 }, 0)
          .to(p, { autoAlpha: 0, xPercent: -15 }, 0)),
        g.classList.add("active"),
        m.classList.add("active"),
        h.classList.add("active"),
        MM.add(
          {
            isDesktop: `(min-width: ${BREAKPOINT}px)`,
            isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
            reduceMotion: "(prefers-reduced-motion: reduce)",
          },
          (e) => {
            let { isDesktop: t, isMobile: a, reduceMotion: r } = e.conditions;
            y.set(h, { autoAlpha: 1, xPercent: 0 }, 0.2)
              .fromTo(
                h.querySelectorAll(".char"),
                { autoAlpha: 0, x: "-0.35em" },
                {
                  autoAlpha: 1,
                  x: "0em",
                  stagger: r ? 0 : { each: 0.015, from: "end" },
                },
                "<",
              )
              .fromTo(
                h.querySelector("p"),
                { autoAlpha: 0, x: "-3em" },
                { autoAlpha: 1, x: "0em" },
                r ? "<" : "<+=0.075",
              )
              .fromTo(
                h.querySelector("a"),
                { autoAlpha: 0, x: "-3em" },
                { autoAlpha: 1, x: "0em" },
                r ? "<" : "<+=0.075",
              )
              .fromTo(
                m,
                { autoAlpha: 0, yPercent: 10 },
                { autoAlpha: 1, yPercent: 0 },
                "<",
              )
              .to(".tab-content__visual", { background: b }, "0");
          },
        ));
    }
    const a = e.querySelectorAll('[data-tabs="content-item"]'),
      r = e.querySelectorAll('[data-tabs="visual-item"]'),
      o = e.querySelectorAll('[data-tabs="text-item"]'),
      n = e.querySelectorAll(".h-l"),
      i = e.querySelector(".tabs-nav__bg"),
      s = e.querySelector(".tabs-nav");
    (e.dataset.tabsAutoplay, parseInt(e.dataset.tabsAutoplayDuration));
    let l = null,
      d = null,
      c = null,
      u = !1;
    (new SplitText(n, { type: "words, chars", charsClass: "char" }),
      t(0),
      ScrollTrigger.create({
        trigger: a[0],
        start: "center 75%",
        once: !0,
        onEnter: () => {
          a[1].click();
        },
      }),
      a.forEach((e, a) => {
        (e.addEventListener("click", () => {
          if (e === l) return;
          t(a);
          let r = Flip.getState(i);
          (e.appendChild(i), Flip.from(r, { duration: 0.5, ease: "slush" }));
        }),
          e.addEventListener("mouseenter", () => {
            let t = Flip.getState(i);
            (e.appendChild(i), Flip.from(t, { duration: 0.5, ease: "slush" }));
          }));
      }),
      s.addEventListener("mouseleave", () => {
        let t = Flip.getState(i);
        (e.querySelector('[data-tabs="content-item"].active').appendChild(i),
          Flip.from(t, { duration: 0.5, ease: "slush" }));
      }));
  });
}
function initCardReveals(e) {
  let t = e.querySelectorAll('[data-card-reveal="wrap"]');
  t.length &&
    t.forEach((e) => {
      let t = e.querySelectorAll('[data-card-reveal="card"]');
      MM.add(
        {
          isDesktop: `(min-width: ${BREAKPOINT}px)`,
          isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (a) => {
          let { isDesktop: r, isMobile: o, reduceMotion: n } = a.conditions;
          (n ||
            gsap.set(t, {
              x: "5em",
              z: "20em",
              rotateY: -30,
              autoAlpha: 0,
              scale: 0.75,
            }),
            ScrollTrigger.create({
              trigger: e,
              start: "top 80%",
              once: !0,
              onEnter: () => {
                gsap.to(t, {
                  x: "0em",
                  z: "0em",
                  rotateY: 0,
                  scale: 1,
                  autoAlpha: 1,
                  ease: "slush-bounce",
                  stagger: { amount: 0.2 },
                  duration: n ? 0 : 0.85,
                });
              },
            }));
        },
      );
    });
}
function initSlantedText(e) {
  let t = e.querySelectorAll("[data-anim-slant]");
  t.length &&
    t.forEach((e) => {
      MM.add(
        {
          isDesktop: `(min-width: ${BREAKPOINT}px)`,
          isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (t) => {
          let { reduceMotion: a } = t.conditions;
          if (!a) {
            var r = new SplitText(e, {
              type: "words, chars",
              charsClass: "char",
              tag: "span",
            });
            (e.setAttribute("aria-label", e.textContent),
              r.words.forEach((e) => {
                e.setAttribute("aria-hidden", "true");
              }),
              gsap.set(r.chars, { x: "-0.25em", autoAlpha: 0 }),
              ScrollTrigger.create({
                trigger: e,
                start: "top 80%",
                once: !0,
                onEnter: () => {
                  gsap.to(r.chars, {
                    ease: "slush-bounce",
                    x: "0em",
                    duration: 0.65,
                    autoAlpha: 1,
                    stagger: { each: 0.015, from: "end" },
                  });
                },
              }));
          }
        },
      );
    });
}
function initHeadingReveal(e) {
  let t = e.querySelectorAll("[data-heading-reveal]");
  t.length &&
    t.forEach((e) => {
      MM.add(
        {
          isDesktop: `(min-width: ${BREAKPOINT}px)`,
          isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (t) => {
          let { reduceMotion: a } = t.conditions;
          if (!a) {
            var r = new SplitText(e, { type: "lines, words" });
            (e.setAttribute("aria-label", e.textContent),
              gsap.set(e, { position: "relative", perspective: 1e3 }),
              gsap.set(r.lines, { z: "5em", rotateY: -45, autoAlpha: 0 }),
              ScrollTrigger.create({
                trigger: e,
                start: "top 80%",
                once: !0,
                onEnter: () => {
                  gsap.to(r.lines, {
                    ease: "slush-bounce",
                    z: "0em",
                    rotateY: 0,
                    duration: 0.85,
                    autoAlpha: 1,
                    stagger: 0.15,
                  });
                },
              }));
          }
        },
      );
    });
}
function initSlideShows(e) {
  e.querySelectorAll('[data-slideshow="wrap"]').forEach((e) => {
    function t(e, t = null) {
      if (n) return;
      n = !0;
      const a = o;
      o =
        null !== t
          ? t
          : 1 === e
            ? o < c - 1
              ? o + 1
              : 0
            : o > 0
              ? o - 1
              : c - 1;
      const r = i[a],
        s = i[o],
        l = r.querySelector(".img-slide__content"),
        u = s.querySelectorAll(".char"),
        p = s.querySelectorAll(".line"),
        g = s.querySelectorAll(".img-slide__lottie");
      gsap
        .timeline({
          defaults: { duration: 0.6 },
          onStart: () => {
            (s.classList.add("is--current"),
              d.length &&
                (d[a].classList.remove("is--current"),
                d[o].classList.add("is--current")));
          },
          onComplete: () => {
            (r.classList.remove("is--current"), (n = !1));
          },
        })
        .set(s, { opacity: 0 })
        .to(r, { opacity: 0 }, 0)
        .fromTo(s, { opacity: 0 }, { opacity: 1 }, 0)
        .set(l, { autoAlpha: 1 }, 0.3)
        .fromTo(
          u,
          { x: "-0.25em", autoAlpha: 0 },
          {
            ease: "slush-bounce",
            x: "0em",
            duration: 0.65,
            autoAlpha: 1,
            stagger: { each: 0.015, from: "end" },
          },
          "<",
        )
        .fromTo(
          p,
          { y: "2em", autoAlpha: 0 },
          {
            ease: "slush",
            y: "0em",
            duration: 0.65,
            autoAlpha: 1,
            stagger: 0.05,
          },
          "<",
        )
        .fromTo(
          g,
          { scale: 0.3, rotate: -90, autoAlpha: 0 },
          {
            scale: 1,
            rotate: 0,
            autoAlpha: 1,
            duration: 1,
            ease: "slush-bounce",
          },
          "<",
        );
    }
    function a() {
      t(1);
    }
    function r() {
      t(-1);
    }
    let o = 0,
      n = !1;
    const i = Array.from(e.querySelectorAll('[data-slideshow="slide"]')),
      s =
        (Array.from(e.querySelectorAll('[data-slideshow="parallax"]')),
        e.querySelector('[data-slideshow="button-prev"]')),
      l = e.querySelector('[data-slideshow="button-next"]');
    let d = Array.from(e.querySelectorAll('[data-slideshow="progress-bar"]'));
    const c = i.length;
    if (
      (e.getAttribute("data-slideshow-orientation"),
      i.forEach((e, t) => e.setAttribute("data-index", t)),
      i[o].classList.add("slide--current"),
      i.forEach((e) => {
        const t = e.querySelector(".img-slide__content"),
          a = t.querySelector("[data-slideshow-heading]"),
          r = t.querySelector("[data-slideshow-para]");
        var o = new SplitText(a, { type: "words, chars", charsClass: "char" });
        (a.setAttribute("aria-label", a.textContent),
          gsap.set(o.chars, { x: "-0.25em", autoAlpha: 0 }));
        var n = new SplitText(r, { type: "lines, words", linesClass: "line" });
        (r.setAttribute("aria-label", r.textContent),
          gsap.set(n.lines, { y: "3em", autoAlpha: 0 }));
      }),
      d.length !== i.length)
    ) {
      const t = d.length ? d[0].parentNode : e;
      t.innerHTML = "";
      for (let e = 0; e < i.length; e++) {
        const a = document.createElement("div");
        (a.setAttribute("data-slideshow", "progress-bar"),
          a.setAttribute("data-index", e),
          a.classList.add("slider-progress__bar"),
          e === o && a.classList.add("is--current"),
          t.appendChild(a));
      }
      d = Array.from(t.querySelectorAll('[data-slideshow="progress-bar"]'));
    } else
      (d.forEach((e, t) => e.setAttribute("data-index", t)),
        d[o].classList.add("is--current"));
    (t(1, 0),
      s && s.addEventListener("click", r),
      l && l.addEventListener("click", a),
      Observer.create({
        target: e,
        type: "touch,pointer",
        onLeft: a,
        onRight: r,
        wheelSpeed: -1,
        tolerance: 20,
        onDragStart: () => {
          gsap.set(e, { cursor: "grabbing" });
        },
        onRelease: () => {
          gsap.set(e, { cursor: "grab" });
        },
      }));
  });
}

// --- BEGIN: Stopmotion Slideshow ---
function initStopmotionSlideshow(scope) {
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

    const reduceMotion = prefersReducedMotion();

    // Tuning via attributes (seconds)
    const HOLD = parseFloat(wrap.getAttribute("data-stopmotion-hold")) || 1.0;
    const FADE = parseFloat(wrap.getAttribute("data-stopmotion-fade")) || 0.25;

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

    // Play/pause only when in viewport
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
    if (ScrollTrigger.isInViewport(wrap, 0.1)) tl.play();
  });
}
// --- END: Stopmotion Slideshow ---
function initLottieAnimations(e) {
  e.querySelectorAll("[data-lottie]").forEach((e) => {
    MM.add(
      {
        isDesktop: `(min-width: ${BREAKPOINT}px)`,
        isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      ({ conditions: { reduceMotion: t } }) => {
        ScrollTrigger.create({
          trigger: e,
          start: "top bottom+=50%",
          once: !0,
          onEnter: () => {
            if (e.hasAttribute("data-lottie-fired")) return;
            if ("load" === e.getAttribute("data-lottie")) return;
            e.setAttribute("data-lottie-fired", "true");
            const a = "hover" === e.getAttribute("data-lottie"),
              r = {
                container: e,
                renderer: "svg",
                loop: !a,
                autoplay: !a && !t,
                path: e.getAttribute("data-lottie-src"),
              },
              o = lottie.loadAnimation(r);
            if (
              (!a &&
                t &&
                o.addEventListener("DOMLoaded", () => o.goToAndStop(0, !0)),
              a && !t)
            ) {
              const t = e.parentElement;
              (o.addEventListener("DOMLoaded", () => o.goToAndStop(0, !0)),
                t.addEventListener("mouseenter", () => o.play()),
                t.addEventListener("mouseleave", () => o.goToAndStop(0, !0)));
            }
          },
        });
      },
    );
  });
}
function fireLotties(e) {
  if (("string" == typeof e && (e = document.querySelector(e)), !e)) return;
  const t = e.querySelectorAll("[data-lottie]");
  t.length &&
    t.forEach((e) => {
      MM.add(
        {
          isDesktop: `(min-width: ${BREAKPOINT}px)`,
          isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (t) => {
          if (e.hasAttribute("data-lottie-fired")) return;
          e.setAttribute("data-lottie-fired", "true");
          const { reduceMotion: a } = t.conditions,
            r = "hover" === e.getAttribute("data-lottie"),
            o = {
              container: e,
              renderer: "svg",
              loop: !r,
              autoplay: !r && !a,
              path: e.getAttribute("data-lottie-src"),
            },
            n = lottie.loadAnimation(o);
          if (
            (!r &&
              a &&
              n.addEventListener("DOMLoaded", () => {
                n.goToAndStop(0, !0);
              }),
            r)
          ) {
            n.addEventListener("DOMLoaded", () => {
              n.goToAndStop(0, !0);
            });
            const t = e.parentElement;
            a ||
              (t.addEventListener("mouseenter", () => {
                n.play();
              }),
              t.addEventListener("mouseleave", () => {
                n.goToAndStop(0, !0);
              }));
          }
        },
      );
    });
}
function initGlobalParallax() {
  gsap
    .matchMedia()
    .add(
      {
        isMobile: "(max-width:479px)",
        isMobileLandscape: "(max-width:767px)",
        isTablet: "(max-width:991px)",
        isDesktop: "(min-width:992px)",
      },
      (e) => {
        const { isMobile: t, isMobileLandscape: a, isTablet: r } = e.conditions,
          o = gsap.context(() => {
            document
              .querySelectorAll('[data-parallax="trigger"]')
              .forEach((e) => {
                const o = e.getAttribute("data-parallax-disable");
                if (
                  ("mobile" === o && t) ||
                  ("mobileLandscape" === o && a) ||
                  ("tablet" === o && r)
                )
                  return;
                const n = e.querySelector('[data-parallax="target"]') || e,
                  i =
                    "horizontal" ===
                    (e.getAttribute("data-parallax-direction") || "vertical")
                      ? "xPercent"
                      : "yPercent",
                  s = e.getAttribute("data-parallax-scrub"),
                  l = !s || parseFloat(s),
                  d = e.getAttribute("data-parallax-start"),
                  c = null !== d ? parseFloat(d) : 20,
                  u = e.getAttribute("data-parallax-end"),
                  p = null !== u ? parseFloat(u) : -20,
                  g = `clamp(${e.getAttribute("data-parallax-scroll-start") || "top bottom"})`,
                  m = `clamp(${e.getAttribute("data-parallax-scroll-end") || "bottom top"})`;
                gsap.fromTo(
                  n,
                  { [i]: c },
                  {
                    [i]: p,
                    ease: "none",
                    scrollTrigger: { trigger: e, start: g, end: m, scrub: l },
                  },
                );
              });
          });
        return () => o.revert();
      },
    );
}
function initGuideDetailPage(e) {
  MM.add(
    {
      isDesktop: `(min-width: ${BREAKPOINT}px)`,
      isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (t) => {
      function a(e) {
        e !== i &&
          (gsap.to(n[i], {
            autoAlpha: 0,
            yPercent: 25,
            duration: 1,
            ease: "slush-bounce",
          }),
          gsap.to(n[e], {
            autoAlpha: 1,
            yPercent: 0,
            duration: 1,
            ease: "slush-bounce",
          }),
          (i = e));
      }
      if (!t.conditions.isDesktop) return;
      const r = e.querySelector(".guides-detail__page");
      if (!r) return;
      const o = r.querySelector(".guides-detail-assets"),
        n = Array.from(o.querySelectorAll(".guides-detail-asset"));
      if (n.length < 2) return;
      (gsap.set(n, { autoAlpha: 0, yPercent: 25 }),
        gsap.set(n[0], { autoAlpha: 1, yPercent: 0 }),
        ScrollTrigger.create({
          trigger: o,
          start: "center center",
          endTrigger: r,
          end: "bottom 75%",
          pin: o,
          pinSpacing: !1,
        }));
      let i = 0;
      Array.from(r.querySelectorAll(".guides-detail__item")).forEach((e, t) => {
        ScrollTrigger.create({
          trigger: e,
          start: "top 65%",
          end: "bottom 65%",
          onEnter: () => a(t),
          onEnterBack: () => a(t),
        });
      });
    },
  );
}
function initHomeVideoIntro(e) {
  let t = e.querySelector(".home-device-row"),
    a = t.querySelector("video");
  gsap.from(a, {
    scale: 0.75,
    autoAlpha: 0,
    yPercent: 40,
    duration: 1.2,
    ease: "slush-bounce",
    scrollTrigger: { trigger: t, start: "top center", once: !0 },
  });
}
function initStackingSlider(
  e,
  {
    minScale: t = 0.6,
    maxRotation: a = -10,
    inertia: r = !0,
    snapTo: o = !0,
  } = {},
) {
  function n() {
    (gsap.set(s, { x: -m }),
      l.forEach((e, r) => {
        const o = r * u,
          n = Math.max(0, m - o),
          i = Math.min(n / u, 1);
        gsap.set(e, {
          x: n,
          scale: 1 - (1 - t) * i,
          rotation: a * i,
          transformOrigin: "center center",
        });
      }));
  }
  gsap.registerPlugin(Draggable, InertiaPlugin);
  const i = e.querySelector('[data-stacking="wrap"]'),
    s = i.querySelector('[data-stacking="slider"]'),
    l = gsap.utils.toArray('[data-stacking="slide"]', s),
    d = getComputedStyle(l[0]),
    c = parseFloat(d.marginRight) || 0,
    u = l[0].offsetWidth + c,
    p = u * (l.length - 1),
    g = gsap.utils.clamp;
  let m = 0;
  ((i.style.touchAction = "none"),
    (i.style.userSelect = "none"),
    Draggable.create(s, {
      type: "x",
      bounds: { minX: -p, maxX: 0 },
      inertia: r,
      snap:
        !!o &&
        ((e) => {
          const t = g(0, p, -e);
          return -Math.round(t / u) * u;
        }),
      onDrag() {
        ((m = g(0, p, -this.x)), n());
      },
      onThrowUpdate() {
        ((m = g(0, p, -this.x)), n());
      },
    })[0],
    n());
}
function initGeneral(e) {
  (
    initDetectScrollingDirection(e),
    updateDownloadCTA(e),
    initSlantedText(e),
    initLottieAnimations(e),
    initHeadingReveal(e),
    initSliders(e),
    initTabSystem(e),
    initCardReveals(e),
    initMarqueeScrollDirection(e),
    initSlideShows(e),
    initStopmotionSlideshow(e),
    initGlobalParallax(),
    initCursorTargets(e),
    initFooter(e)
  );
}
function runHomeLoad(e) {
  const t = e.querySelectorAll(".home-logo-letter-list"),
    a = (e.querySelector(".section"), e.querySelectorAll("[data-home-sub-el]"));
  MM.add(
    {
      isDesktop: `(min-width: ${BREAKPOINT}px)`,
      isMobile: `(max-width: ${BREAKPOINT - 1}px)`,
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (e) => {
      let { isDesktop: r, isMobile: o, reduceMotion: n } = e.conditions;
      n ||
        (gsap.from(a, {
          y: "2em",
          autoAlpha: 0,
          stagger: 0.3,
          ease: "slush-bounce",
          delay: 1.5,
          duration: 1,
        }),
        t.forEach((e, t) => {
          const a = e.querySelectorAll(".home-logo-letter-el"),
            r = a[0].querySelectorAll(".home-logo-letter");
          gsap
            .timeline({ defaults: { duration: 1.25 }, delay: 0.05 * t })
            .to(r, { yPercent: -100, stagger: 0.15 })
            .to(a[1], { yPercent: -100 }, 0.5);
        }));
    },
  );
}
function runPageLoad(e, t) {
  const a = e.querySelector(".section"),
    r = a.querySelectorAll("[data-load-stagger]"),
    o = a.querySelectorAll("[data-lottie]"),
    n = e.querySelector("[data-anim-hero]"),
    i = e.querySelector("[data-hero-content]"),
    s = e.querySelector("[data-hero-fade]");
  (fireLotties(a),
    "home" === e.getAttribute("data-barba-namespace") && runHomeLoad(e));
  let l = t || 0.1;
  const d = new SplitText(n, { type: "words, chars", charsClass: "char" });
  (n &&
    (n.setAttribute("aria-label", d.textContent),
    gsap.set(d.chars, { x: "-0.25em", autoAlpha: 0 })),
    gsap
      .timeline({
        defaults: {
          ease: "slush-bounce",
          onStart: () => {
            (lenis.start(), gsap.set(e, { height: "auto", overflow: "clip" }));
          },
        },
        delay: l,
      })
      .to(i, { opacity: 1, duration: 0.1, ease: "power1" })
      .to(
        d.chars,
        {
          x: "0em",
          duration: 0.65,
          autoAlpha: 1,
          stagger: { each: 0.015, from: "end" },
        },
        0,
      )
      .fromTo(
        r,
        { y: "3em", autoAlpha: 0 },
        {
          y: "0em",
          autoAlpha: 1,
          stagger: 0.1,
          duration: 1,
          ease: "slush-bounce",
        },
        "<+=0.5",
      )
      .from(
        o,
        {
          scale: 0.2,
          autoAlpha: 0,
          duration: 1,
          rotate: -90,
          stagger: { each: 0.1, from: "random" },
        },
        "<",
      )
      .fromTo(s, { autoAlpha: 0 }, { autoAlpha: 1 }, "<"));
}
function runTransition(e, t, a) {
  const r = e.parentElement,
    o = document.createElement("div"),
    n = (t.querySelector("[data-anim-hero]"), t.querySelector(".section")),
    i =
      (n.querySelectorAll("[data-load-stagger]"),
      document.querySelectorAll(".page-transition-el")),
    s =
      (n.querySelectorAll("[data-lottie]"),
      t.querySelector("[data-hero-content]"),
      t.querySelector("[data-hero-fade]")),
    l = gsap.utils.shuffle([
      "#4da2ff",
      "#ffd731",
      "#e9ccff",
      "#55db9c",
      "#fb4903",
      "#5c4ade",
    ]);
  (i.forEach((e, t) => {
    t < l.length && gsap.set(e, { backgroundColor: l[t] });
  }),
    gsap.set(o, {
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 2,
      clipPath: "inset(0px round 2em)",
    }),
    r.insertBefore(o, e),
    o.appendChild(e),
    window.scrollTo(0, 0));
  let d = 1.25,
    c = 0.8,
    u = 45;
  return gsap
    .timeline({
      onComplete: () => {
        (lenis.start(),
          ScrollTrigger.refresh(),
          gsap.set([r, t], { clearProps: !0 }),
          gsap.set(i, { display: "none" }));
      },
      defaults: { ease: "slush-bounce" },
    })
    .set([r, t], { height: "100vh", overflow: "hidden", perspective: 1e3 })
    .set(i[0], { display: "block", z: "-50vw", rotateY: 45, xPercent: -200 })
    .set(i[1], { display: "block", z: "-50vw", rotateY: -45, xPercent: 200 })
    .set(i[2], { display: "block", z: "-25vw", rotateY: -45, xPercent: 200 })
    .set(t, {
      rotateY: -45,
      xPercent: 200,
      z: "-50vw",
      "--overlay": "0",
      borderRadius: "2em",
    })
    .set(s, { autoAlpha: 0 })
    .set(e, {
      left: "0",
      right: "0",
      zIndex: 2,
      position: "absolute",
      top: `-${a}px`,
    })
    .to(e, { "--overlay": "0", duration: 0.15, ease: "power1" })
    .to(o, { z: "-100vw", duration: c }, "<")
    .to(i[0], { xPercent: -100, rotateY: 22.5, z: "-85vw", duration: c }, "<")
    .to(i[1], { xPercent: 100, rotateY: -22.5, z: "-85vw", duration: c }, "<")
    .to(
      o,
      {
        rotateY: 45,
        xPercent: -200,
        z: "-50vw",
        duration: d,
        onComplete: () => {
          o.remove();
        },
      },
      ">-=0.25",
    )
    .to(i[0], { xPercent: -300, rotateY: 67.5, z: "-25vw", duration: d }, "<")
    .to(i[1], { xPercent: -100, rotateY: 22.5, z: "-85vw", duration: d }, "<")
    .to(i[2], { xPercent: 100, rotateY: -22.5, z: "-85vw", duration: d }, "<")
    .to(t, { rotateY: 0, xPercent: 0, z: "-100vw", duration: d }, "<")
    .to(
      t,
      {
        "--overlay": "0",
        z: "0vw",
        borderRadius: "0em",
        ease: "slush",
        duration: c,
      },
      ">-=0.5",
    )
    .to(
      i[1],
      { xPercent: -200, rotateY: u, z: "-25vw", duration: 1.875 },
      "<+=0.2",
    )
    .to(
      i[2],
      {
        xPercent: 200,
        rotateY: -45,
        z: "-25vw",
        duration: 1.875,
        onStart: () => {
          runPageLoad(t, 0.15);
        },
      },
      "<",
    );
}
function runReducedTransition(e, t) {
  const a = e.parentElement,
    r = document.createElement("div");
  return (
    gsap.set(r, {
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 2,
      clipPath: "inset(0px round 2em)",
    }),
    a.insertBefore(r, e),
    r.appendChild(e),
    window.scrollTo(0, 0),
    gsap
      .timeline({
        onComplete: () => {
          (r.remove(),
            lenis.start(),
            ScrollTrigger.refresh(),
            gsap.set(t, { clearProps: !0 }));
        },
        defaults: { ease: "slush" },
      })
      .to(r, { autoAlpha: 0 })
      .fromTo(
        t,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 1,
          onStart: () => {
            runPageLoad(t, 0.15);
          },
        },
        "<",
      )
  );
}
function runMobileRedirect(e) {
  const t = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(t))
    window.location.replace(
      "https://play.google.com/store/apps/details?id=com.mystenlabs.suiwallet",
    );
  else if (/iPad|iPhone|iPod/.test(t) && !window.MSStream)
    window.location.replace(
      "https://apps.apple.com/us/app/slush-wallet/id6476572140",
    );
  else {
    updateDownloadCTA(e);
    const t = e.querySelectorAll(".centered-hero");
    (gsap.set(t[0], { display: "none" }), gsap.set(t[1], { display: "flex" }));
  }
}
let resizeTimer;
(gsap.registerPlugin(
  ScrollTrigger,
  SplitText,
  CustomEase,
  Draggable,
  InertiaPlugin,
  Flip,
  Observer,
),
  CustomEase.create("slush", "0.65, 0.05, 0, 1"),
  CustomEase.create(
    "slush-bounce",
    "M0,0 L0.076,0.5737 L0.1187,0.8382 L0.1419,0.9463 L0.1654,1.0292 L0.1897,1.0886 L0.2153,1.1258 L0.2297,1.137 L0.2448,1.1424 L0.261,1.1423 L0.2786,1.1366 L0.3101,1.1165 L0.3862,1.0507 L0.4257,1.0219 L0.4699,0.9995 L0.5163,0.9872 L0.5877,0.9842 L0.8126,1.0011 L1,1",
  ),
  gsap.defaults({ ease: "slush", duration: 0.525 }));
let lenis,
  previousWindowWidth = window.innerWidth,
  prefersRM = prefersReducedMotion(),
  MM = gsap.matchMedia(),
  BREAKPOINT = 768,
  menuToggle = document.querySelector("#menuButton"),
  menuState = closed;
const icons = {
  chrome:
    "https://cdn.prod.website-files.com/67d9fcb123f67f0f34dd8fd1/67f7ce4359a6e2706dc1b2a6_icon-chrome.png",
  brave:
    "https://cdn.prod.website-files.com/67d9fcb123f67f0f34dd8fd1/67ffeb09ce81d10a1d586610_logo-brave.svg",
  edge: "https://cdn.prod.website-files.com/67d9fcb123f67f0f34dd8fd1/67ffeb09104ad033e792c649_logo-ie.svg",
  firefox:
    "https://cdn.prod.website-files.com/67d9fcb123f67f0f34dd8fd1/67ffeb094a3b7dfadc90e7fa_logo-firefox.svg",
  ios: "https://cdn.prod.website-files.com/67d9fcb123f67f0f34dd8fd1/67f7ce43ccc9e5088ce2591d_icon-ios.png",
  android:
    "https://cdn.prod.website-files.com/67d9fcb123f67f0f34dd8fd1/67ffebd1f755a89577119587_logo-android.svg",
  arc: "https://cdn.prod.website-files.com/67d9fcb123f67f0f34dd8fd1/67ffeb09686ca8b9bec5caf9_logo-arc.svg",
};
(document.addEventListener("DOMContentLoaded", () => {
  (initMenu(), initCursor());
}),
  barba.hooks.leave(() => {
    document
      .querySelectorAll(".slideshow-wrapper[data-stopmotion-initialized]")
      .forEach((wrap) => {
        if (wrap.__stopmotionST) {
          wrap.__stopmotionST.kill();
          wrap.__stopmotionST = null;
        }
        if (wrap.__stopmotionTl) {
          wrap.__stopmotionTl.kill();
          wrap.__stopmotionTl = null;
        }
        wrap.removeAttribute("data-stopmotion-initialized");
      });
    (
      lenis.destroy(),
      document.body.setAttribute("data-scrolling-direction", "down"),
      document.body.setAttribute("data-scrolling-started", "false")
    );
  }),
  barba.hooks.enter((e) => {
    initBarbaNavUpdate(e);
  }),
  barba.hooks.once(() => {}),
  barba.hooks.afterEnter((e) => {
    let t = e.next.container;
    (e.next.namespace,
      ScrollTrigger.getAll().forEach((e) => {
        e.kill();
      }),
      void 0 === Webflow.env("editor") && initLenis(),
      initGeneral(t));
  }),
  barba.init({
    preventRunning: !0,
    prevent: function ({ el: e }) {
      if (e.hasAttribute("data-barba-prevent")) return !0;
    },
    transitions: [
      {
        name: "custom",
        sync: !0,
        once(e) {
          (gsap.to("#navContainer", {
            y: "0%",
            ease: "slush",
            duration: 0.8,
            delay: 0.6,
          }),
            runPageLoad(e.next.container));
        },
        leave(e) {
          const { container: t } = e.current,
            { container: a } = e.next,
            r = window.scrollY;
          return (
            lenis.stop(),
            updateDownloadCTA(e.next.container),
            menuState && menuToggle.click(),
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? runReducedTransition(t, a)
              : runTransition(t, a, r)
          );
        },
      },
    ],
    views: [
      {
        namespace: "home",
        afterEnter(e) {
          let t = e.next.container;
          (initStackingSlider(t), initHomeVideoIntro(t));
        },
      },
      {
        namespace: "defi",
        afterEnter(e) {
          initVerticalMarqueeScrollDirection(e.next.container);
        },
      },
      {
        namespace: "guide",
        afterEnter(e) {
          initGuideDetailPage(e.next.container);
        },
      },
      {
        namespace: "mobile-download",
        afterEnter(e) {
          runMobileRedirect(e.next.container);
        },
      },
    ],
  }));
