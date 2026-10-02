/**
 * Site motion, taken from GCC Cornell's: section reveals, the stat count-up,
 * and the home hero that stays pinned while the page slides over it. (The
 * page-title entrance is CSS only, in global.css.)
 *
 * Every effect is progressive enhancement. The HTML is always the final,
 * fully visible page; this script only adds the hidden starting state, so with
 * JavaScript off, in print, or for a visitor who asked for reduced motion,
 * nothing is hidden and nothing moves. Reduced motion is checked once, here,
 * and turns all of it off.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasObserver = 'IntersectionObserver' in window;

/** GCC's ease-out cubic. */
const easeOut = (k: number) => 1 - (1 - k) ** 3;

/** A malformed escape in a URL fragment must not stop the page's motion. */
function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Trigger-once rise. `.rise` is the marker in the markup; each one starts
 * hidden and gets `is-in` when it clears the lower 12% of the viewport.
 * Children of a `[data-stagger]` container follow one after another.
 */
function initReveals() {
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--i', String(i)));
  });

  const targets = document.querySelectorAll<HTMLElement>('.rise');
  // The section a link's #fragment points at is never hidden: the browser has
  // already scrolled to its resting place, and starting it 24px low would land
  // it 24px off once it rose.
  const linked = document.getElementById(safeDecode(location.hash.slice(1)));
  targets.forEach((el) => {
    el.classList.add('js-reveal');
    if (linked && el.contains(linked)) el.classList.add('is-in');
  });

  if (!hasObserver) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // A target already scrolled past (an anchor jump, a fast fling) is
        // shown too, so nothing is left hidden above the reader.
        if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  targets.forEach((el) => {
    if (!el.classList.contains('is-in')) observer.observe(el);
  });
}

/**
 * Stat count-up. The markup holds the final value (`.stat-final`) and the
 * integer target (`data-count`). Here a live figure is stacked over it in the
 * same grid cell: the final value keeps the width, so nothing shifts while
 * the digits change, and it stays the text a screen reader gets, since the
 * live figure is aria-hidden. When the group comes into view every figure
 * counts from 0 to its target, then the live figure is dropped and only the
 * markup's own final value remains.
 */
function initCountUp() {
  if (!hasObserver) return;

  const DURATION = 900;
  const number = new Intl.NumberFormat('en-US');

  document.querySelectorAll<HTMLElement>('[data-stats]').forEach((group) => {
    const figures = Array.from(group.querySelectorAll<HTMLElement>('[data-count]'))
      .map((el) => {
        const target = Number(el.dataset.count);
        if (!Number.isSafeInteger(target) || target < 0) return null;
        const prefix = el.dataset.prefix ?? '';
        const suffix = el.dataset.suffix ?? '';
        const live = document.createElement('span');
        live.className = 'stat-live';
        live.setAttribute('aria-hidden', 'true');
        const show = (value: number) => (live.textContent = `${prefix}${number.format(value)}${suffix}`);
        show(0);
        el.append(live);
        el.classList.add('is-counting');
        return { el, live, target, show };
      })
      .filter((figure) => figure !== null);
    if (!figures.length) return;

    const finish = () => figures.forEach(({ el, live }) => (live.remove(), el.classList.remove('is-counting')));

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / DURATION);
        if (k >= 1) return finish();
        figures.forEach(({ target, show }) => show(Math.round(target * easeOut(k))));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) return;
        observer.disconnect();
        // Scrolled past without ever being seen: no one to count for.
        if (entry.isIntersecting) run();
        else finish();
      },
      { rootMargin: '0px 0px -20% 0px' },
    );
    observer.observe(group);
  });
}

/**
 * Home hero, pinned like GCC's: it stays put while the paper sheet slides up
 * over it, and as it goes the hero text fades and lifts, the video zooms, and
 * the frame pales toward paper.
 *
 * It only pins when its content fits the viewport. On a short screen the hero
 * is taller than the viewport and scrolls like any other, so no text is ever
 * covered before it can be read.
 */
function initHeroPin() {
  const hero = document.querySelector<HTMLElement>('.hero-home');
  if (!hero) return;

  let pinned = false;
  let frame = 0;

  const update = () => {
    frame = 0;
    // GCC's curves: the text and tint run out by 55% of a screen scrolled,
    // the zoom by a full screen.
    const y = Math.max(0, window.scrollY);
    const vh = window.innerHeight;
    hero.style.setProperty('--hero-f', Math.min(1, y / (0.55 * vh)).toFixed(4));
    hero.style.setProperty('--hero-g', Math.min(1, y / vh).toFixed(4));
  };

  const setPinned = (next: boolean) => {
    if (next === pinned) return;
    pinned = next;
    hero.classList.toggle('is-pinned', next);
    if (next) {
      update();
    } else {
      hero.style.removeProperty('--hero-f');
      hero.style.removeProperty('--hero-g');
    }
  };

  // The hero is at least one small viewport tall (its min-height); it is taller
  // only when its content does not fit.
  const measure = () => {
    const screen = parseFloat(getComputedStyle(hero).minHeight);
    setPinned(hero.offsetHeight <= screen + 1);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (pinned && !frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  window.addEventListener('resize', measure);
  // Content size changes after load too (web fonts swap in).
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(hero);
  measure();

  // A pinned hero stays behind the sheet once it is scrolled over, so keyboard
  // focus can land on a control the reader cannot see. Bring the top of the
  // page back when it does.
  hero.addEventListener('focusin', (event) => {
    if (pinned && window.scrollY > 0 && (event.target as Element).matches(':focus-visible')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  });
}

if (!reduced) {
  initReveals();
  initCountUp();
  initHeroPin();
}
