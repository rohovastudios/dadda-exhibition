(function () {
  const DENSITY_STORAGE_KEY = "dadda-density-mode";
  const LEGACY_DENSITY_KEY = "dadda-grid-density";
  const NAV_KEY = "dadda-nav-intent";
  const SUBMIT_DRAFT_KEY = "dadda-submit-draft";
  const SUBMIT_DRAFT_VERSION = 2;
  const SUBMIT_NAV_KEY = "dadda-submit-nav";
  const SITE_HTML_VERSION = "65";
  const PAGE_FADE_MS = 1000;
  const OVERLAY_FADE_MS = 1000;

  function getDaddaConfig() {
    return window.DADDA_CONFIG || {};
  }

  function isDadsArchiveLive() {
    const launch = getDaddaConfig().dadsArchiveLaunch;
    if (!launch) return true;
    const launchDate = new Date(`${launch}T00:00:00`);
    if (Number.isNaN(launchDate.getTime())) return true;
    return Date.now() >= launchDate.getTime();
  }

  function initPrelaunchHome() {
    document.body.classList.add("home-prelaunch");
    const prelaunch = document.getElementById("home-prelaunch");
    const grid = document.getElementById("archive-grid");
    const densityToggle = document.getElementById("density-toggle");
    if (prelaunch) prelaunch.hidden = false;
    if (grid) grid.hidden = true;
    if (densityToggle) densityToggle.hidden = true;
  }

  function homeUrl(params = {}) {
    const url = new URL("index.html", window.location.href);
    url.searchParams.delete("about");
    url.searchParams.delete("viewer");
    url.searchParams.delete("image");
    url.searchParams.set("v", SITE_HTML_VERSION);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value ?? "");
    });
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function buildProfileShareUrl(slug, imageIndex = 0) {
    const url = new URL("index.html", window.location.href);
    url.searchParams.set("viewer", slug);
    if (Number.isInteger(imageIndex) && imageIndex > 0) {
      url.searchParams.set("image", String(imageIndex));
    } else {
      url.searchParams.delete("image");
    }
    url.searchParams.delete("about");
    return url.href;
  }

  async function shareProfile({ title, slug, imageIndex = 0 }) {
    const url = buildProfileShareUrl(slug, imageIndex);
    const shareTitle = title ? `${title} — dadda?` : "dadda?";
    const shareText = "A story from dadda?, an exhibition about single fatherhood.";

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return { method: "share", url };
      } catch (err) {
        if (err?.name === "AbortError") return { method: "cancel", url };
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { method: "copy", url };
    }

    window.prompt("Copy this link:", url);
    return { method: "prompt", url };
  }

  function showShareFeedback(button, message) {
    if (!button) return;
    const original = button.textContent;
    button.textContent = message;
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 2000);
  }

  async function handleShareClick(button, { title, slug, imageIndex }) {
    const result = await shareProfile({ title, slug, imageIndex });
    if (result.method === "copy") {
      showShareFeedback(button, "Link copied");
    }
  }

  let archiveRevealObserver = null;

  function densityRowGap(mode) {
    const config = DENSITY_MODES[mode];
    return config.rowGap ?? config.baseHeight * 0.5625;
  }

  /** Tyler --scale: width at fixed display height = baseHeight × aspectRatio */
  function scaleForImage(baseHeight, naturalWidth, naturalHeight) {
    if (!naturalWidth || !naturalHeight) return baseHeight;
    return baseHeight * (naturalWidth / naturalHeight);
  }

  function applyThumbScale(img, baseHeight) {
    const setScale = () => {
      const scale = scaleForImage(baseHeight, img.naturalWidth, img.naturalHeight);
      img.style.setProperty("--scale", `${scale}px`);
    };

    if (img.complete && img.naturalWidth) {
      setScale();
      return;
    }

    img.addEventListener("load", setScale, { once: true });
  }

  function getDensityMode() {
    const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (saved && DENSITY_MODE_ORDER.includes(saved)) return saved;
    return DEFAULT_DENSITY_MODE;
  }

  function setDensityMode(mode) {
    localStorage.setItem(DENSITY_STORAGE_KEY, mode);
  }

  function effectiveTargetCount(mode) {
    const requested = DENSITY_MODES[mode].targetCount;
    const max = maxGridCount(DADS);
    return Math.min(requested, max);
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  const PROTECTED_IMG_SELECTOR = [
    ".archiveThumb img",
    ".slideViewer__image",
    ".slideViewer__grid .archiveThumb img",
    ".siteWordmark__logo",
    ".site-brand__logo",
    ".project-header__brand img",
    ".project-stage img",
    ".dad-project-grid .grid-cell img",
    ".home-grid .grid-cell img",
  ].join(", ");

  const PROTECTED_LOGO_SELECTOR = ".siteWordmark, .site-brand, .project-header__brand";

  function isProtectedMedia(el) {
    if (!(el instanceof Element)) return false;
    if (el.matches(PROTECTED_IMG_SELECTOR)) return true;
    return Boolean(el.closest(PROTECTED_LOGO_SELECTOR) && el.tagName === "IMG");
  }

  function protectImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    img.draggable = false;
    img.classList.add("protected-media");
  }

  function initImageProtection() {
    document.querySelectorAll(PROTECTED_IMG_SELECTOR).forEach(protectImage);

    document.addEventListener("contextmenu", (event) => {
      if (isProtectedMedia(event.target)) event.preventDefault();
    });

    document.addEventListener("dragstart", (event) => {
      if (isProtectedMedia(event.target)) event.preventDefault();
    });
  }

  function markActiveNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === page);
    });
  }

  function getNavigationType() {
    const entry = performance.getEntriesByType("navigation")[0];
    return entry?.type || "navigate";
  }

  function clearSubmitDraftStorage() {
    try {
      localStorage.removeItem(SUBMIT_DRAFT_KEY);
      sessionStorage.removeItem(SUBMIT_DRAFT_KEY);
    } catch (_err) {
      // ignore
    }
  }

  function abandonSubmitDraft() {
    clearSubmitDraftStorage();
    try {
      sessionStorage.removeItem(SUBMIT_NAV_KEY);
    } catch (_err) {
      // ignore
    }
  }

  function markSubmitPageActive() {
    try {
      sessionStorage.setItem(SUBMIT_NAV_KEY, "on-page");
    } catch (_err) {
      // ignore
    }
  }

  function markSubmitPageLeft() {
    try {
      const state = sessionStorage.getItem(SUBMIT_NAV_KEY);
      if (state === "on-page") {
        sessionStorage.setItem(SUBMIT_NAV_KEY, "left-once");
      }
    } catch (_err) {
      // ignore
    }
  }

  function shouldRestoreSubmitDraft() {
    const raw =
      localStorage.getItem(SUBMIT_DRAFT_KEY) ||
      sessionStorage.getItem(SUBMIT_DRAFT_KEY);
    if (!raw) return false;

    const navType = getNavigationType();
    if (navType === "reload" || navType === "back_forward") {
      return true;
    }

    if (navType === "navigate") {
      try {
        const navState = sessionStorage.getItem(SUBMIT_NAV_KEY);
        if (navState === "on-page") {
          return true;
        }
      } catch (_err) {
        // ignore
      }
      clearSubmitDraftStorage();
    }

    return false;
  }

  function initSubmitDraftAbandon() {
    if (document.body.dataset.page === "submit") return;

    let navState;
    try {
      navState = sessionStorage.getItem(SUBMIT_NAV_KEY);
    } catch (_err) {
      return;
    }
    if (navState !== "left-once") return;

    document.addEventListener(
      "click",
      (event) => {
        if (!event.target.closest("a[href]")) return;
        abandonSubmitDraft();
      },
      true
    );
  }

  function navigateWithFade(url, intent) {
    if (prefersReducedMotion()) {
      window.location.href = url;
      return;
    }
    sessionStorage.setItem(NAV_KEY, intent);
    document.body.classList.add("is-exiting");
    window.setTimeout(() => {
      window.location.href = url;
    }, PAGE_FADE_MS);
  }

  function initPageEnter() {
    if (prefersReducedMotion()) {
      document.body.classList.add("is-ready");
      document
        .getElementById("archive-grid")
        ?.querySelectorAll(".archiveThumb")
        .forEach((thumb) => thumb.classList.add("is-revealed"));
      document.getElementById("dad-stage")?.classList.add("is-visible");
      document.querySelector(".aboutOverlay--page")?.classList.add("is-visible");
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.body.classList.add("is-ready");
        document.getElementById("dad-stage")?.classList.add("is-visible");
        document.querySelector(".aboutOverlay--page")?.classList.add("is-visible");
      });
    });
  }

  function versionInternalLinks() {
    document.querySelectorAll('a[href="index.html"]').forEach((link) => {
      link.setAttribute("href", homeUrl());
    });

    if (document.body.dataset.page !== "home") {
      document.querySelectorAll('a[href="about.html"]').forEach((link) => {
        link.setAttribute("href", homeUrl({ about: "" }));
      });
    }
  }

  function bindFadeNavigation() {
    const page = document.body.dataset.page;
    if (page === "home") return;

    document.querySelectorAll("a[href]").forEach((link) => {
      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      const path = url.pathname;
      const isIndex = /\/index\.html$/.test(path) || path.endsWith("/");
      if (!isIndex) return;

      if (page === "dad") {
        if (
          !link.classList.contains("project-header__close") &&
          !link.classList.contains("project-header__brand")
        ) {
          return;
        }
      }

      const opensAbout = url.searchParams.has("about");

      link.addEventListener("click", (event) => {
        event.preventDefault();
        navigateWithFade(
          opensAbout ? homeUrl({ about: "" }) : homeUrl(),
          opensAbout ? "open-about" : page === "dad" ? "close-project" : "back-home",
        );
      });
    });
  }

  function aboutUrlHasParam() {
    return new URLSearchParams(window.location.search).has("about");
  }

  function aboutHistoryUrl(includeAbout) {
    const url = new URL(window.location.href);
    if (includeAbout) {
      url.searchParams.set("about", "");
      url.searchParams.delete("viewer");
      url.searchParams.delete("image");
    } else {
      url.searchParams.delete("about");
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function syncAboutHistory(open) {
    if (!window.history?.replaceState) return;
    const nextUrl = aboutHistoryUrl(open);
    if (open) {
      window.history.pushState({ about: true }, "", nextUrl);
      return;
    }
    if (window.history.state?.about || aboutUrlHasParam()) {
      window.history.replaceState(null, "", nextUrl);
    }
  }

  function initAboutOverlay() {
    const overlay = document.getElementById("about-overlay");
    if (!overlay) return null;

    const isStandalone = overlay.classList.contains("aboutOverlay--page");
    if (isStandalone) {
      window.location.replace(homeUrl({ about: "" }));
      return null;
    }

    const backdrop = overlay.querySelector(".aboutOverlay__backdrop");
    const closeButtons = document.querySelectorAll("#about-close, .aboutClose");
    const archiveGrid = document.getElementById("archive-grid");
    let isOpen = false;
    let isClosing = false;
    let closeTimer = null;
    let archiveScrollTop = 0;

    function setAboutOpen(open, { syncHistory = true } = {}) {
      if (open) {
        if (closeTimer) {
          window.clearTimeout(closeTimer);
          closeTimer = null;
        }
        if (archiveGrid) archiveScrollTop = archiveGrid.scrollTop;
        isClosing = false;
        overlay.classList.remove("is-closing");
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        document.body.dataset.aboutOpen = "true";
        document.body.style.overflow = "hidden";
        closeButtons.forEach((btn) => {
          btn.hidden = false;
        });

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            overlay.classList.add("is-open", "is-visible");
            isOpen = true;
          });
        });
        return;
      }

      if (!isOpen || isClosing) return;

      isClosing = true;
      overlay.classList.remove("is-open", "is-visible");
      overlay.classList.add("is-closing");

      const closeMs = prefersReducedMotion() ? 0 : OVERLAY_FADE_MS;

      closeTimer = window.setTimeout(() => {
        overlay.classList.remove("is-closing");
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
        document.body.removeAttribute("data-about-open");
        document.body.style.overflow = "";
        closeButtons.forEach((btn) => {
          btn.hidden = true;
        });
        if (archiveGrid) archiveGrid.scrollTop = archiveScrollTop;
        isOpen = false;
        isClosing = false;
        closeTimer = null;
      }, closeMs);

      if (syncHistory) syncAboutHistory(false);
    }

    function openAbout({ syncHistory = true } = {}) {
      if (isOpen || isClosing) return;
      setAboutOpen(true, { syncHistory: false });
      if (syncHistory) syncAboutHistory(true);
    }

    function closeAbout() {
      if (!isOpen || isClosing) return;
      setAboutOpen(false);
    }

    document.querySelectorAll('a[href="about.html"]').forEach((link) => {
      if (document.body.dataset.page !== "home") return;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openAbout();
      });
    });

    closeButtons.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        closeAbout();
      });
    });

    if (backdrop) {
      backdrop.addEventListener("click", closeAbout);
    }

    document.addEventListener("keydown", (event) => {
      if (!isOpen || isClosing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeAbout();
      }
    });

    window.addEventListener("popstate", () => {
      const shouldBeOpen = window.history.state?.about || aboutUrlHasParam();
      if (shouldBeOpen) {
        if (!isOpen && !isClosing) openAbout({ syncHistory: false });
        return;
      }
      if (isOpen && !isClosing) setAboutOpen(false, { syncHistory: false });
    });

    if (aboutUrlHasParam() && !viewerUrlHasParam()) {
      window.requestAnimationFrame(() => openAbout({ syncHistory: false }));
    }

    return { openAbout, closeAbout, setAboutOpen };
  }

  function applyArchiveDensity(grid, mode) {
    const { baseHeight } = DENSITY_MODES[mode];
    grid.style.setProperty("--thumb-base-height", `${baseHeight}px`);
    grid.style.setProperty("--archive-row-gap", `${densityRowGap(mode)}px`);
    grid.dataset.density = mode;
  }

  function renderDensityToggle(container, activeMode, onChange) {
    container.innerHTML = "";
    DENSITY_MODE_ORDER.forEach((mode) => {
      const config = DENSITY_MODES[mode];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = config.label;
      btn.dataset.density = mode;
      btn.title = `${config.label} — ${effectiveTargetCount(mode)} images`;
      btn.addEventListener("click", () => onChange(mode));
      container.appendChild(btn);
    });
    updateDensityToggleUI(container, activeMode);
  }

  function updateDensityToggleUI(container, mode) {
    container.querySelectorAll("button").forEach((btn) => {
      const isActive = btn.dataset.density === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function disconnectArchiveReveal() {
    if (!archiveRevealObserver) return;
    archiveRevealObserver.disconnect();
    archiveRevealObserver = null;
  }

  function observeArchiveThumb(thumb) {
    if (!archiveRevealObserver) return;
    if (thumb.classList.contains("is-revealed")) return;
    if (prefersReducedMotion()) {
      thumb.classList.add("is-revealed");
      return;
    }
    thumb.classList.remove("is-revealed");
    const delay = Math.floor(Math.random() * 351);
    const duration = 700 + Math.floor(Math.random() * 1101);
    thumb.style.setProperty("--reveal-delay", `${delay}ms`);
    thumb.style.setProperty("--reveal-duration", `${duration}ms`);
    archiveRevealObserver.observe(thumb);
  }

  function setupArchiveReveal(grid) {
    disconnectArchiveReveal();

    const thumbs = grid.querySelectorAll(".archiveThumb");
    if (!thumbs.length) return;

    if (prefersReducedMotion()) {
      thumbs.forEach((thumb) => thumb.classList.add("is-revealed"));
      return;
    }

    archiveRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          archiveRevealObserver.unobserve(entry.target);
        });
      },
      {
        root: grid,
        rootMargin: "0px 0px 8% 0px",
        threshold: 0.05,
      }
    );

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        thumbs.forEach((thumb) => observeArchiveThumb(thumb));
      });
    });
  }

  function createArchiveThumb(item, baseHeight) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "archiveThumb";
    btn.setAttribute("role", "listitem");
    btn.dataset.slug = item.slug;
    btn.dataset.index = String(item.imageIndex);

    const inner = document.createElement("span");
    inner.className = "archiveThumb__inner";

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    img.classList.add("protected-media");
    img.style.setProperty("--scale", `${baseHeight}px`);

    applyThumbScale(img, baseHeight);

    inner.appendChild(img);
    btn.appendChild(inner);
    return btn;
  }

  function syncArchiveGrid(grid, items, mode) {
    const { baseHeight } = DENSITY_MODES[mode];
    const existing = [...grid.querySelectorAll(".archiveThumb")];

    while (existing.length > items.length) {
      const thumb = existing.pop();
      archiveRevealObserver?.unobserve(thumb);
      thumb.remove();
    }

    existing.forEach((thumb, index) => {
      const item = items[index];
      thumb.dataset.slug = item.slug;
      thumb.dataset.index = String(item.imageIndex);

      const img = thumb.querySelector("img");
      if (img && img.getAttribute("src") !== item.src) {
        img.src = item.src;
        img.alt = item.name;
      }
      if (img) applyThumbScale(img, baseHeight);
    });

    for (let index = existing.length; index < items.length; index += 1) {
      const thumb = createArchiveThumb(items[index], baseHeight);
      grid.appendChild(thumb);
      observeArchiveThumb(thumb);
    }
  }

  function initArchiveGrid(openViewer) {
    const grid = document.getElementById("archive-grid");
    const densityToggle = document.getElementById("density-toggle");
    if (!grid || !densityToggle || grid.dataset.initialized === "true") return;
    grid.dataset.initialized = "true";

    let densityMode = getDensityMode();
    setDensityMode(densityMode);

    let revealReady = false;

    function applyDensity(mode) {
      const targetCount = effectiveTargetCount(mode);
      const items = buildGridItems(DADS, targetCount);
      const prevCount = grid.querySelectorAll(".archiveThumb").length;

      applyArchiveDensity(grid, mode);
      updateDensityToggleUI(densityToggle, mode);
      syncArchiveGrid(grid, items, mode);

      if (!revealReady) {
        setupArchiveReveal(grid);
        revealReady = true;
        return;
      }

      grid.querySelectorAll(".archiveThumb").forEach((thumb, index) => {
        if (index >= prevCount) observeArchiveThumb(thumb);
      });
    }

    grid.addEventListener("click", (event) => {
      const thumb = event.target.closest(".archiveThumb");
      if (!thumb || !grid.contains(thumb)) return;
      event.preventDefault();
      openViewer(thumb.dataset.slug, Number(thumb.dataset.index));
    });

    renderDensityToggle(densityToggle, densityMode, (mode) => {
      if (mode === densityMode) return;
      densityMode = mode;
      setDensityMode(densityMode);
      applyDensity(mode);
    });

    applyDensity(densityMode);
  }

  function viewerUrlHasParam() {
    return new URLSearchParams(window.location.search).has("viewer");
  }

  function viewerHistoryUrl(slug, imageIndex, includeViewer) {
    const url = new URL(window.location.href);
    if (includeViewer && slug) {
      url.searchParams.set("viewer", slug);
      if (Number.isFinite(imageIndex) && imageIndex > 0) {
        url.searchParams.set("image", String(imageIndex));
      } else {
        url.searchParams.delete("image");
      }
      url.searchParams.delete("about");
    } else {
      url.searchParams.delete("viewer");
      url.searchParams.delete("image");
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function syncViewerHistory(slug, imageIndex, open) {
    if (!window.history?.replaceState) return;
    const nextUrl = viewerHistoryUrl(slug, imageIndex, open);
    if (open) {
      window.history.pushState({ viewer: slug, image: imageIndex }, "", nextUrl);
      return;
    }
    if (window.history.state?.viewer || viewerUrlHasParam()) {
      window.history.replaceState(null, "", nextUrl);
    }
  }

  function initSlideViewer() {
    const viewer = document.getElementById("slide-viewer");
    if (!viewer) return null;

    document.body.removeAttribute("data-viewer-open");

    const backdropEl = viewer.querySelector(".slideViewer__backdrop");
    const slidesPanel = document.getElementById("viewer-slides");
    const imageEl = document.getElementById("viewer-image");
    const captionEl = document.getElementById("viewer-caption");
    const counterEl = document.getElementById("viewer-counter");
    const viewerCloseBtn = viewer.querySelector(".slideViewer__close");
    const zonePrev = viewer.querySelector(".slideViewer__zone--prev");
    const zoneNext = viewer.querySelector(".slideViewer__zone--next");
    const cursorHint = document.getElementById("viewer-cursor-hint");
    const closerBtn = document.getElementById("viewer-closer-btn");
    const shareBtn = document.getElementById("viewer-share-btn");
    const detailEl = document.getElementById("viewer-detail");
    const detailBackdrop = document.getElementById("viewer-detail-backdrop");
    const detailCloseBtn = document.getElementById("viewer-detail-close");
    const detailContent = document.getElementById("viewer-detail-content");
    const archiveGrid = document.getElementById("archive-grid");
    const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let currentDad = null;
    let slideIndex = 0;
    let closerOpen = false;
    let isOpen = false;
    let isClosing = false;
    let closeTimer = null;
    let archiveScrollTop = 0;

    function hideCursorHint() {
      if (!cursorHint) return;
      cursorHint.classList.remove("is-visible");
      cursorHint.textContent = "";
      viewer.classList.remove("is-cursor-nav");
    }

    function showCursorHint(label, clientX, clientY) {
      if (!cursorHint || !hasFinePointer) return;
      cursorHint.textContent = label;
      cursorHint.style.left = `${clientX}px`;
      cursorHint.style.top = `${clientY}px`;
      cursorHint.classList.add("is-visible");
      viewer.classList.add("is-cursor-nav");
    }

    function updateSlideCursor(event) {
      if (!isOpen || isClosing || closerOpen || !hasFinePointer) {
        hideCursorHint();
        return;
      }

      const stage = viewer.querySelector(".slideViewer__stage");
      const { clientX, clientY } = event;

      if (event.target instanceof Element && event.target.closest(".slideViewer__meta")) {
        hideCursorHint();
        return;
      }

      if (stage) {
        const stageRect = stage.getBoundingClientRect();

        if (clientY < stageRect.top || clientY > stageRect.bottom) {
          hideCursorHint();
          return;
        }

        if (
          clientX >= stageRect.left &&
          clientX <= stageRect.right
        ) {
          hideCursorHint();
          return;
        }
      }

      const viewerRect = viewer.getBoundingClientRect();
      const midX = viewerRect.left + viewerRect.width / 2;

      if (clientX < midX) {
        showCursorHint("Back", clientX, clientY);
        return;
      }

      showCursorHint("Next", clientX, clientY);
    }

    function buildCloserHtml(dad) {
      const sections = [];

      if (Array.isArray(dad.responses) && dad.responses.length) {
        dad.responses.forEach((entry) => {
          if (!entry?.text) return;
          const prompt = entry.prompt || "";
          const body = entry.text.split("\n\n").join("</p><p>");
          sections.push(
            prompt
              ? `<section><h2 class="section-label">${prompt}</h2><p>${body}</p></section>`
              : `<p>${body}</p>`
          );
        });
      } else if (dad.story) {
        sections.push(
          `<section><h2 class="section-label">Story</h2><p>${dad.story.split("\n\n").join("</p><p>")}</p></section>`
        );
      }

      if (dad.info?.biography) {
        sections.push(
          `<section><hr class="section-rule" /><h2 class="section-label">Biography</h2><p>${dad.info.biography}</p></section>`
        );
      }

      if (dad.location) {
        sections.push(`<section><hr class="section-rule" /><p>${dad.location}</p></section>`);
      }

      return sections.join("");
    }

    function setCloserOpen(open) {
      closerOpen = open;

      if (closerBtn) {
        closerBtn.setAttribute("aria-expanded", open ? "true" : "false");
      }

      if (!detailEl) return;

      if (open) {
        hideCursorHint();
        detailEl.classList.remove("is-closing");
        detailEl.hidden = false;
        detailEl.setAttribute("aria-hidden", "false");
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            detailEl.classList.add("is-open", "is-visible");
            viewer.classList.add("is-closer-open");
          });
        });
        return;
      }

      if (detailEl.hidden) return;

      detailEl.classList.remove("is-open", "is-visible");
      detailEl.classList.add("is-closing");
      viewer.classList.remove("is-closer-open");

      window.setTimeout(() => {
        detailEl.classList.remove("is-closing");
        detailEl.hidden = true;
        detailEl.setAttribute("aria-hidden", "true");
      }, prefersReducedMotion() ? 0 : OVERLAY_FADE_MS);
    }

    function renderSlide() {
      if (!currentDad) return;
      imageEl.src = currentDad.images[slideIndex];
      imageEl.alt = currentDad.name;
      captionEl.textContent = currentDad.name;
      counterEl.textContent = `${slideIndex + 1} of ${currentDad.images.length}`;
    }

    function goToSlide(nextIndex) {
      if (!currentDad) return;
      slideIndex = (nextIndex + currentDad.images.length) % currentDad.images.length;
      renderSlide();
      if (isOpen) {
        const nextUrl = viewerHistoryUrl(currentDad.slug, slideIndex, true);
        window.history.replaceState({ viewer: currentDad.slug, image: slideIndex }, "", nextUrl);
      }
    }

    function setViewerOpen(open, { syncHistory = true } = {}) {
      if (open) {
        if (closeTimer) {
          window.clearTimeout(closeTimer);
          closeTimer = null;
        }
        if (archiveGrid) archiveScrollTop = archiveGrid.scrollTop;
        isClosing = false;
        viewer.classList.remove("is-closing");
        viewer.hidden = false;
        viewer.setAttribute("aria-hidden", "false");
        document.body.dataset.viewerOpen = "true";
        document.body.style.overflow = "hidden";

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            viewer.classList.add("is-open", "is-visible");
            isOpen = true;
          });
        });
        return;
      }

      if (!isOpen || isClosing) return;

      setCloserOpen(false);
      isClosing = true;
      viewer.classList.remove("is-open", "is-visible");
      viewer.classList.add("is-closing");

      const closeMs = prefersReducedMotion() ? 0 : OVERLAY_FADE_MS;

      closeTimer = window.setTimeout(() => {
        viewer.classList.remove("is-closing");
        viewer.hidden = true;
        viewer.setAttribute("aria-hidden", "true");
        document.body.removeAttribute("data-viewer-open");
        document.body.style.overflow = "";
        if (archiveGrid) archiveGrid.scrollTop = archiveScrollTop;
        hideCursorHint();
        if (detailEl) {
          detailEl.hidden = true;
          detailEl.classList.remove("is-open", "is-visible", "is-closing");
          detailEl.setAttribute("aria-hidden", "true");
        }
        viewer.classList.remove("is-closer-open");
        closerOpen = false;
        if (closerBtn) {
          closerBtn.setAttribute("aria-expanded", "false");
        }
        imageEl.removeAttribute("src");
        currentDad = null;
        isOpen = false;
        isClosing = false;
        closeTimer = null;
      }, closeMs);

      if (syncHistory) syncViewerHistory(null, 0, false);
    }

    function openViewer(slug, imageIndex, { syncHistory = true } = {}) {
      const dad = getDadBySlug(slug);
      if (!dad) return;
      if (isOpen || isClosing) return;

      currentDad = dad;
      slideIndex = Number.isFinite(imageIndex) ? imageIndex : 0;
      if (slideIndex < 0 || slideIndex >= dad.images.length) slideIndex = 0;

      if (detailContent) detailContent.innerHTML = buildCloserHtml(dad);
      setCloserOpen(false);
      renderSlide();
      setViewerOpen(true, { syncHistory: false });
      if (syncHistory) syncViewerHistory(dad.slug, slideIndex, true);
    }

    function closeViewer() {
      if (!isOpen || isClosing) return;
      setViewerOpen(false);
    }

    function isBackdropCloseTarget(target) {
      if (!(target instanceof Element)) return false;
      if (closerOpen) return false;
      if (target.closest(".slideViewer__zone")) return false;
      if (target.closest(".slideViewer__image")) return false;
      if (target.closest(".slideViewer__meta")) return false;
      return (
        target === backdropEl ||
        target === slidesPanel ||
        target.closest(".slideViewer__stage") ||
        target.closest(".slideViewer__caption") ||
        target.closest(".slideViewer__counter")
      );
    }

    if (viewerCloseBtn) {
      viewerCloseBtn.addEventListener("click", (event) => {
        if (!isOpen && !isClosing) return;
        event.preventDefault();
        closeViewer();
      });
    }

    if (backdropEl) {
      backdropEl.addEventListener("click", () => {
        if (closerOpen) {
          setCloserOpen(false);
          return;
        }
        closeViewer();
      });
    }

    viewer.addEventListener("click", (event) => {
      if (!isOpen || isClosing) return;
      if (closerOpen) return;
      if (isBackdropCloseTarget(event.target)) {
        closeViewer();
      }
    });

    if (closerBtn) {
      closerBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCloserOpen(!closerOpen);
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!currentDad) return;
        handleShareClick(shareBtn, {
          title: currentDad.name,
          slug: currentDad.slug,
          imageIndex: slideIndex,
        });
      });
    }

    if (detailBackdrop) {
      detailBackdrop.addEventListener("click", () => setCloserOpen(false));
    }

    if (detailCloseBtn) {
      detailCloseBtn.addEventListener("click", (event) => {
        event.preventDefault();
        setCloserOpen(false);
      });
    }

    zonePrev.addEventListener("click", () => goToSlide(slideIndex - 1));
    zoneNext.addEventListener("click", () => goToSlide(slideIndex + 1));

    slidesPanel.addEventListener("mouseleave", hideCursorHint);
    viewer.addEventListener("mousemove", updateSlideCursor);
    viewer.addEventListener("mouseleave", hideCursorHint);

    imageEl.addEventListener("click", () => goToSlide(slideIndex + 1));

    document.addEventListener("keydown", (event) => {
      if (!isOpen || isClosing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (closerOpen) {
          setCloserOpen(false);
          return;
        }
        closeViewer();
        return;
      }
      if (closerOpen) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToSlide(slideIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToSlide(slideIndex + 1);
      }
    });

    window.addEventListener("popstate", () => {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get("viewer") || window.history.state?.viewer;
      const shouldBeOpen = Boolean(slug);
      if (shouldBeOpen) {
        const imageIndex = Number(params.get("image") || window.history.state?.image || 0);
        if (!isOpen && !isClosing) openViewer(slug, imageIndex, { syncHistory: false });
        return;
      }
      if (isOpen && !isClosing) setViewerOpen(false, { syncHistory: false });
    });

    if (viewerUrlHasParam() && !aboutUrlHasParam()) {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get("viewer");
      const imageIndex = Number(params.get("image") || 0);
      if (slug) {
        window.requestAnimationFrame(() => openViewer(slug, imageIndex, { syncHistory: false }));
      }
    }

    return openViewer;
  }

  function initRandomShortcut(openViewer) {
    document.addEventListener("keydown", (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "r") return;
      if (document.body.dataset.page !== "home") return;
      event.preventDefault();
      const dad = DADS[Math.floor(Math.random() * DADS.length)];
      const imageIndex = Math.floor(Math.random() * dad.images.length);
      openViewer(dad.slug, imageIndex);
    });
  }

  function initDadPage() {
    const stageRoot = document.getElementById("dad-stage");
    if (!stageRoot) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    const dad = slug ? getDadBySlug(slug) : null;
    if (!dad) {
      document.body.innerHTML =
        '<main class="page-shell page-shell--narrow"><p class="prose">Project not found. <a href="index.html">Return home</a>.</p></main>';
      return;
    }

    let slideIndex = Number(params.get("image") || 0);
    if (Number.isNaN(slideIndex) || slideIndex < 0) slideIndex = 0;
    if (slideIndex >= dad.images.length) slideIndex = 0;

    const slidesEl = document.getElementById("dad-slides");
    const infoEl = document.getElementById("dad-info");
    const infoBackdrop = document.getElementById("description-background");
    const infoPanel = document.getElementById("description-panel");
    const counterEl = document.getElementById("dad-counter");

    infoEl.innerHTML = `
      <h2>Story</h2>
      <p>${dad.story.split("\n\n").join("</p><p>")}</p>
      <h2>Biography</h2>
      <p>${dad.info.biography}</p>
      <p>${dad.location}</p>`;

    function setInfoOpen(open) {
      if (!infoBackdrop || !infoPanel) return;

      if (open) {
        infoEl.hidden = false;
        infoBackdrop.hidden = false;
        infoPanel.hidden = false;
        window.requestAnimationFrame(() => {
          infoBackdrop.classList.add("is-open");
          infoPanel.classList.add("is-open");
        });
        return;
      }

      infoBackdrop.classList.remove("is-open");
      infoPanel.classList.remove("is-open");
      window.setTimeout(() => {
        infoEl.hidden = true;
        infoBackdrop.hidden = true;
        infoPanel.hidden = true;
      }, prefersReducedMotion() ? 0 : PAGE_FADE_MS);
    }

    function syncDadPageUrl(imageIndex) {
      if (!window.history?.replaceState) return;
      const url = new URL(window.location.href);
      url.searchParams.set("slug", dad.slug);
      if (imageIndex > 0) {
        url.searchParams.set("image", String(imageIndex));
      } else {
        url.searchParams.delete("image");
      }
      window.history.replaceState({ slug: dad.slug, image: imageIndex }, "", `${url.pathname}${url.search}${url.hash}`);
    }

    function goToSlide(nextIndex) {
      slideIndex = (nextIndex + dad.images.length) % dad.images.length;
      renderSlides();
      syncDadPageUrl(slideIndex);
    }

    function renderSlides() {
      slidesEl.innerHTML = `
        <div class="project-stage-wrap">
          <div class="project-stage">
            <img class="protected-media" src="${dad.images[slideIndex]}" alt="${dad.name}" draggable="false" />
          </div>
          <button type="button" class="project-nav project-nav--prev" id="project-prev" aria-label="Previous image">Prev</button>
          <button type="button" class="project-nav project-nav--next" id="project-next" aria-label="Next image">Next</button>
        </div>
        <h1 class="project-title">${dad.name}</h1>
        <p class="project-links">
          <button type="button" id="dad-share-btn">Share</button>
          <button type="button" id="dad-info-btn">More Info</button>
        </p>`;

      counterEl.textContent = `${slideIndex + 1} of ${dad.images.length}`;

      document.getElementById("dad-share-btn").addEventListener("click", (event) => {
        event.preventDefault();
        handleShareClick(event.currentTarget, {
          title: dad.name,
          slug: dad.slug,
          imageIndex: slideIndex,
        });
      });

      document.getElementById("dad-info-btn").addEventListener("click", () => {
        setInfoOpen(true);
      });

      document.getElementById("project-prev").addEventListener("click", () => {
        goToSlide(slideIndex - 1);
      });

      document.getElementById("project-next").addEventListener("click", () => {
        goToSlide(slideIndex + 1);
      });

      slidesEl.querySelector(".project-stage img").addEventListener("click", () => {
        goToSlide(slideIndex + 1);
      });
    }

    if (infoBackdrop) {
      infoBackdrop.addEventListener("click", () => setInfoOpen(false));
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToSlide(slideIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToSlide(slideIndex + 1);
      }
      if (event.key === "Escape") setInfoOpen(false);
    });

    renderSlides();
    setInfoOpen(false);
  }

  function initSubmitForm() {
    const form = document.getElementById("submit-form");
    if (!form || document.body.dataset.page !== "submit") return;

    const TOTAL_STEPS = 7;
    const steps = [...form.querySelectorAll(".submit-step[data-step]")].filter(
      (el) => el.dataset.step !== "success"
    );
    const successStep = form.querySelector('[data-step="success"]');
    const prevBtn = document.getElementById("submit-prev");
    const nextBtn = document.getElementById("submit-next");
    const submitBtn = document.getElementById("submit-send");
    const nav = document.getElementById("submit-wizard-nav");
    const stepCurrentEl = document.getElementById("submit-step-current");
    const stepTotalEl = document.getElementById("submit-step-total");
    const progressFill = document.getElementById("submit-progress-fill");
    const progressBar = form.querySelector(".submit-wizard__progress-bar");

    const SAVE_DRAFT_MS = 400;

    let currentStep = 1;
    let signatureMode = "typed";
    let releaseScrolled = false;
    let saveDraftTimer = null;
    let draftPersistenceEnabled = true;

    function readDraftStorage() {
      try {
        return (
          localStorage.getItem(SUBMIT_DRAFT_KEY) ||
          sessionStorage.getItem(SUBMIT_DRAFT_KEY)
        );
      } catch (_err) {
        return null;
      }
    }

    function writeDraftStorage(value) {
      try {
        localStorage.setItem(SUBMIT_DRAFT_KEY, value);
        sessionStorage.removeItem(SUBMIT_DRAFT_KEY);
      } catch (_err) {
        // Storage full or unavailable; skip silently.
      }
    }

    const signatureTyped = document.getElementById("signature_typed");
    const signatureTypeField = document.getElementById("signature_type");
    const signatureImageField = document.getElementById("signature_image");
    const signatureCanvas = document.getElementById("signature-canvas");
    const signatureClear = document.getElementById("signature-clear");
    const signatureSection = document.getElementById("submit-signature");
    const releaseEl = document.getElementById("submit-release");
    const releaseHint = document.getElementById("submit-release-hint");
    const releaseReadField = document.getElementById("legal_release_read");
    const fileInput = document.getElementById("supporting_images");
    const filePreviewList = document.getElementById("supporting-images-previews");
    const submitIntro = document.getElementById("submit-intro");
    const submitConfirm = document.getElementById("submit-confirm");
    const submitConfirmBackdrop = document.getElementById("submit-confirm-backdrop");
    const submitConfirmClose = document.getElementById("submit-confirm-close");
    const submitConfirmCancel = document.getElementById("submit-confirm-cancel");
    const submitConfirmProceed = document.getElementById("submit-confirm-proceed");

    const progressWrap = form.querySelector(".submit-wizard__progress");

    stepTotalEl.textContent = String(TOTAL_STEPS);

    function showError(fieldName, show) {
      const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
      if (errorEl) errorEl.hidden = !show;
      const input = form.querySelector(`#${fieldName}`) || form.querySelector(`[name="${fieldName}"]`);
      input?.closest(".submit-field")?.classList.toggle("is-invalid", show);
    }

    function syncPromptOptions() {
      const selects = [...form.querySelectorAll("[data-response-prompt]")];
      const chosen = selects.map((select) => select.value).filter(Boolean);

      selects.forEach((select) => {
        [...select.options].forEach((option) => {
          if (!option.value) return;
          const takenElsewhere = chosen.includes(option.value) && select.value !== option.value;
          option.disabled = takenElsewhere;
        });
      });
    }

    function isReleaseScrolledToEnd() {
      if (!releaseEl) return true;
      const threshold = 12;
      return releaseEl.scrollHeight - releaseEl.scrollTop - releaseEl.clientHeight <= threshold;
    }

    function updateReleaseScrollUI() {
      const scrolled = releaseScrolled || isReleaseScrolledToEnd();
      releaseScrolled = scrolled;
      signatureSection?.classList.toggle("submit-signature--locked", !scrolled);
      if (releaseHint) releaseHint.hidden = scrolled;
      if (releaseReadField) releaseReadField.value = scrolled ? "yes" : "";
      showError("release_scroll", false);
    }

    function validateReleaseScroll() {
      const scrolled = isReleaseScrolledToEnd();
      releaseScrolled = scrolled;
      updateReleaseScrollUI();
      if (!scrolled) {
        showError("release_scroll", true);
        releaseEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
      return true;
    }

    function validateResponseBlock(index, required = false) {
      const prompt = form.querySelector(`#response_${index}_prompt`);
      const text = form.querySelector(`#response_${index}`);
      const promptOk = Boolean(prompt?.value);
      const textOk = Boolean(text?.value.trim());
      let blockOk = true;

      if (required) {
        blockOk = promptOk && textOk;
        showError(`response_${index}_prompt`, !promptOk);
        showError(`response_${index}`, !textOk);
        return blockOk;
      }

      if (promptOk || textOk) {
        blockOk = promptOk && textOk;
        showError(`response_${index}_prompt`, !promptOk);
        showError(`response_${index}`, !textOk);
      } else {
        showError(`response_${index}_prompt`, false);
        showError(`response_${index}`, false);
      }

      return blockOk;
    }

    function normalizePhoneInput(value) {
      const digitsAndPlus = value.replace(/[^\d+]/g, "");
      if (!digitsAndPlus) return "";

      const digits = digitsAndPlus.replace(/\D/g, "");
      if (!digits) return "+";

      return `+${digits}`;
    }

    function isValidPhone(value) {
      if (!value.trim()) return true;
      return /^\+[1-9]\d{6,14}$/.test(value);
    }

    function initPhoneField() {
      const phoneInput = form.querySelector("#phone");
      if (!phoneInput) return;

      phoneInput.addEventListener("focus", () => {
        if (!phoneInput.value) phoneInput.value = "+";
      });

      phoneInput.addEventListener("input", () => {
        const normalized = normalizePhoneInput(phoneInput.value);
        if (phoneInput.value !== normalized) {
          phoneInput.value = normalized;
        }
        showError("phone", false);
      });

      phoneInput.addEventListener("blur", () => {
        if (phoneInput.value === "+") {
          phoneInput.value = "";
        }
      });
    }

    function isValidFullLegalName(value) {
      const parts = value.trim().split(/\s+/).filter(Boolean);
      return parts.length >= 2 && parts.every((part) => part.length > 0);
    }

    function validateStep(step) {
      let valid = true;

      if (step === 1) {
        const name = form.querySelector("#full_legal_name");
        const email = form.querySelector("#email");
        const phone = form.querySelector("#phone");
        const nameOk = isValidFullLegalName(name?.value || "");
        const emailOk = Boolean(email?.value.trim()) && email.validity.valid;
        const phoneValue = phone?.value.trim() || "";
        const phoneOk = isValidPhone(phoneValue);
        showError("full_legal_name", !nameOk);
        showError("email", !emailOk);
        showError("phone", !phoneOk);
        phone?.closest(".submit-field")?.classList.toggle("is-invalid", !phoneOk);
        if (!nameOk || !emailOk || !phoneOk) valid = false;
      }

      if (step === 4) {
        const firstOk = validateResponseBlock(1, true);
        const secondOk = validateResponseBlock(2, false);
        const thirdOk = validateResponseBlock(3, false);
        if (!firstOk || !secondOk || !thirdOk) valid = false;
      }

      if (step === 7) {
        if (!validateReleaseScroll()) valid = false;

        const consents = form.querySelectorAll("[data-consent]");
        const allChecked = [...consents].every((cb) => cb.checked);
        consents.forEach((cb) => {
          cb.closest(".submit-check")?.classList.toggle("is-invalid", !cb.checked);
        });
        showError("consent", !allChecked);
        if (!allChecked) valid = false;

        let sigOk = false;
        if (signatureMode === "typed") {
          sigOk = Boolean(signatureTyped?.value.trim());
        } else if (signatureCanvas) {
          sigOk = !isCanvasBlank(signatureCanvas);
          if (sigOk) {
            signatureImageField.value = signatureCanvas.toDataURL("image/png");
            signatureTyped.removeAttribute("name");
          }
        }
        showError("signature", !sigOk);
        if (!sigOk) valid = false;
      }

      return valid;
    }

    function isCanvasBlank(canvas) {
      const ctx = canvas.getContext("2d");
      const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
      );
      return !pixelBuffer.some((color) => color !== 0);
    }

    function collectDraftFields() {
      const fields = {};
      form.querySelectorAll("input, textarea, select").forEach((el) => {
        const { name, type } = el;
        if (!name || type === "file") return;

        if (type === "checkbox") {
          if (!fields[name]) fields[name] = [];
          if (el.checked) fields[name].push(el.value);
          return;
        }

        if (type === "radio") {
          if (el.checked) fields[name] = el.value;
          return;
        }

        fields[name] = el.value;
      });
      return fields;
    }

    function saveDraft() {
      if (!draftPersistenceEnabled) return;
      try {
        const payload = {
          version: SUBMIT_DRAFT_VERSION,
          step: currentStep,
          signatureMode,
          releaseScrolled,
          fields: collectDraftFields(),
        };
        if (signatureMode === "draw" && signatureCanvas && !isCanvasBlank(signatureCanvas)) {
          payload.signatureImage = signatureCanvas.toDataURL("image/png");
        } else if (signatureImageField?.value) {
          payload.signatureImage = signatureImageField.value;
        }
        writeDraftStorage(JSON.stringify(payload));
      } catch (_err) {
        // Storage full or unavailable; skip silently.
      }
    }

    function flushSaveDraft() {
      if (!draftPersistenceEnabled) return;
      clearTimeout(saveDraftTimer);
      saveDraftTimer = null;
      saveDraft();
    }

    function scheduleSaveDraft() {
      if (!draftPersistenceEnabled) return;
      clearTimeout(saveDraftTimer);
      saveDraftTimer = setTimeout(saveDraft, SAVE_DRAFT_MS);
    }

    function clearDraft() {
      clearSubmitDraftStorage();
    }

    function restoreDraftFields(fields) {
      if (!fields || typeof fields !== "object") return;

      Object.entries(fields).forEach(([name, value]) => {
        const group = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
        if (!group.length) return;

        const first = group[0];
        if (first.type === "checkbox") {
          const checked = Array.isArray(value) ? value : [];
          group.forEach((el) => {
            el.checked = checked.includes(el.value);
          });
          return;
        }

        if (first.type === "radio") {
          group.forEach((el) => {
            el.checked = el.value === value;
          });
          return;
        }

        if (group.length === 1) {
          group[0].value = value;
        }
      });
    }

    function setSignatureMode(mode) {
      signatureMode = mode;
      signatureTypeField.value = mode;
      form.querySelectorAll(".submit-signature__tab").forEach((t) => {
        const active = t.dataset.signatureMode === mode;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      form.querySelectorAll("[data-signature-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.signaturePanel !== mode;
      });
      if (mode === "typed") {
        signatureTyped.setAttribute("name", "signature");
        signatureImageField.value = "";
      } else {
        signatureTyped.removeAttribute("name");
      }
    }

    function mapLegacyDraftStep(step) {
      // Old 8-step flow: 1–5 unchanged; 6–7 consent/signature → 7; 8 interview → 6.
      if (step <= 5) return step;
      if (step === 8) return 6;
      if (step === 6 || step === 7) return 7;
      return 1;
    }

    function restoreDraft() {
      const raw = readDraftStorage();
      if (!raw) return false;

      let draft;
      try {
        draft = JSON.parse(raw);
      } catch (_err) {
        clearDraft();
        return false;
      }

      let step = Number(draft.step);
      const draftVersion = draft.version;

      if (draftVersion === SUBMIT_DRAFT_VERSION) {
        step = Math.min(step, TOTAL_STEPS);
      } else if (draftVersion == null || draftVersion === 1) {
        step = mapLegacyDraftStep(step);
      } else {
        clearDraft();
        return false;
      }

      if (!Number.isInteger(step) || step < 1) {
        clearDraft();
        return false;
      }

      const stepEl = steps.find((el) => Number(el.dataset.step) === step);
      if (!stepEl) {
        clearDraft();
        currentStep = 1;
        updateUI();
        return false;
      }

      restoreDraftFields(draft.fields);

      if (draft.signatureMode === "typed" || draft.signatureMode === "draw") {
        setSignatureMode(draft.signatureMode);
      }

      if (draft.signatureMode === "draw" && draft.signatureImage && signatureCanvas) {
        const ctx = signatureCanvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
          ctx.drawImage(img, 0, 0);
          signatureImageField.value = draft.signatureImage;
        };
        img.src = draft.signatureImage;
      }

      if (draft.releaseScrolled) {
        releaseScrolled = true;
      }

      syncPromptOptions();
      goToStep(step);
      return true;
    }

    function showSubmissionSuccess() {
      draftPersistenceEnabled = false;
      clearTimeout(saveDraftTimer);
      saveDraftTimer = null;
      steps.forEach((stepEl) => {
        stepEl.hidden = true;
      });
      if (successStep) {
        successStep.hidden = false;
      }
      if (progressWrap) {
        progressWrap.hidden = true;
      }
      if (submitIntro) {
        submitIntro.hidden = true;
      }
      prevBtn.hidden = true;
      nextBtn.hidden = true;
      submitBtn.hidden = true;
      nav.hidden = true;
      nav.setAttribute("aria-hidden", "true");
      document.body.classList.add("is-submit-success");
      abandonSubmitDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updateUI() {
      steps.forEach((stepEl) => {
        const stepNum = Number(stepEl.dataset.step);
        stepEl.hidden = stepNum !== currentStep;
      });

      stepCurrentEl.textContent = String(currentStep);
      progressFill.style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;
      progressBar?.setAttribute("aria-valuenow", String(currentStep));

      prevBtn.hidden = currentStep <= 1;
      nextBtn.hidden = currentStep >= TOTAL_STEPS;
      submitBtn.hidden = currentStep !== TOTAL_STEPS;

      if (successStep?.hidden === false) {
        nav.hidden = true;
      }

      if (currentStep === 7) {
        updateReleaseScrollUI();
      }
    }

    function goToStep(step) {
      const cropActive =
        (cropOverlay && cropOverlay.hidden === false) ||
        cropQueue.length > 0 ||
        recropBackup ||
        currentCropFile;
      if (cropActive) {
        cancelCropFlow();
      }

      currentStep = Math.max(1, Math.min(TOTAL_STEPS, step));
      updateUI();
      if (currentStep === 5) {
        syncSupportingFilesUI();
      }
      saveDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    prevBtn.addEventListener("click", () => {
      goToStep(currentStep - 1);
    });

    nextBtn.addEventListener("click", () => {
      const stepEl = steps.find((el) => Number(el.dataset.step) === currentStep);
      if (stepEl?.dataset.required === "true" && !validateStep(currentStep)) {
        stepEl.querySelector(".submit-field__error:not([hidden]), [data-error-for]:not([hidden])")?.closest(".submit-step")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      goToStep(currentStep + 1);
    });

    form.querySelectorAll(".submit-signature__tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        setSignatureMode(tab.dataset.signatureMode);
        scheduleSaveDraft();
      });
    });

    if (signatureCanvas) {
      const ctx = signatureCanvas.getContext("2d");
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      let drawing = false;

      function getPoint(event) {
        const rect = signatureCanvas.getBoundingClientRect();
        const scaleX = signatureCanvas.width / rect.width;
        const scaleY = signatureCanvas.height / rect.height;
        if (event.touches?.[0]) {
          return {
            x: (event.touches[0].clientX - rect.left) * scaleX,
            y: (event.touches[0].clientY - rect.top) * scaleY,
          };
        }
        return {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
      }

      function startDraw(event) {
        event.preventDefault();
        drawing = true;
        const point = getPoint(event);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
      }

      function draw(event) {
        if (!drawing) return;
        event.preventDefault();
        const point = getPoint(event);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      function endDraw() {
        drawing = false;
        scheduleSaveDraft();
      }

      signatureCanvas.addEventListener("mousedown", startDraw);
      signatureCanvas.addEventListener("mousemove", draw);
      signatureCanvas.addEventListener("mouseup", endDraw);
      signatureCanvas.addEventListener("mouseleave", endDraw);
      signatureCanvas.addEventListener("touchstart", startDraw, { passive: false });
      signatureCanvas.addEventListener("touchmove", draw, { passive: false });
      signatureCanvas.addEventListener("touchend", endDraw);

      signatureClear?.addEventListener("click", () => {
        ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        signatureImageField.value = "";
        scheduleSaveDraft();
      });
    }

    releaseEl?.addEventListener("scroll", () => {
      updateReleaseScrollUI();
      scheduleSaveDraft();
    }, { passive: true });
    window.addEventListener("resize", () => {
      if (currentStep === 7) updateReleaseScrollUI();
    });

    const releaseEnd = document.getElementById("submit-release-end");
    if (releaseEl && releaseEnd && "IntersectionObserver" in window) {
      const releaseObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            releaseScrolled = true;
            updateReleaseScrollUI();
            scheduleSaveDraft();
          }
        },
        { root: releaseEl, threshold: 1 }
      );
      releaseObserver.observe(releaseEnd);
    }

    function initCountrySelect() {
      const countrySelect = form.querySelector("#country_of_residence");
      const countries = window.DADDA_COUNTRIES;
      if (!countrySelect || countrySelect.tagName !== "SELECT" || !Array.isArray(countries)) return;

      const preferred = "United States";
      const ordered = [preferred, ...countries.filter((country) => country !== preferred)];

      ordered.forEach((country) => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
      });
    }

    initPhoneField();
    initCountrySelect();

    form.addEventListener("input", scheduleSaveDraft);
    form.addEventListener("change", scheduleSaveDraft);

    window.addEventListener("pagehide", () => {
      flushSaveDraft();
      if (draftPersistenceEnabled) {
        markSubmitPageLeft();
      } else {
        try {
          sessionStorage.removeItem(SUBMIT_NAV_KEY);
        } catch (_err) {
          // ignore
        }
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushSaveDraft();
    });

    form.querySelectorAll("[data-response-prompt]").forEach((select) => {
      select.addEventListener("change", syncPromptOptions);
    });
    syncPromptOptions();

    const MAX_SUPPORTING_FILES = 5;
    const MAX_SUPPORTING_FILE_BYTES = 8 * 1024 * 1024;
    const MAX_SUPPORTING_TOTAL_BYTES = 30 * 1024 * 1024;
    const MAX_SUPPORTING_FILE_LABEL = "8 MB";
    const MAX_SUPPORTING_TOTAL_LABEL = "30 MB";
    let selectedSupportingFiles = [];
    const supportingOriginalFiles = new Map();
    const supportingCropStates = new Map();
    const supportingPreviewUrls = new Map();
    const supportingPreviewFiles = new Map();
    let recropBackup = null;
    let pendingCropRestore = null;
    let suppressSupportingInputChange = false;

    const supportingFileErrors = {
      size: `Each image must be under ${MAX_SUPPORTING_FILE_LABEL}.`,
      count: `You can upload up to ${MAX_SUPPORTING_FILES} images total.`,
      total: `Combined uploads must stay under ${MAX_SUPPORTING_TOTAL_LABEL}.`,
      generic: "Please try a different image.",
    };

    function formatFileSize(bytes) {
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function filesAreSame(a, b) {
      return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
    }

    function validateSupportingFiles(fileList) {
      const files = [...(fileList || [])];
      if (!files.length) {
        return { valid: true, files: [], message: "" };
      }

      if (files.length > MAX_SUPPORTING_FILES) {
        return {
          valid: false,
          files: [],
          message: supportingFileErrors.count,
        };
      }

      const oversized = files.find((file) => file.size > MAX_SUPPORTING_FILE_BYTES);
      if (oversized) {
        return {
          valid: false,
          files: [],
          message: supportingFileErrors.size,
        };
      }

      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_SUPPORTING_TOTAL_BYTES) {
        return {
          valid: false,
          files: [],
          message: supportingFileErrors.total,
        };
      }

      return { valid: true, files, message: "" };
    }

    function addSupportingFiles(existing, incoming) {
      const merged = [...existing];
      const skipped = [];

      for (const file of incoming) {
        if (merged.some((existingFile) => filesAreSame(existingFile, file))) {
          continue;
        }

        if (merged.length >= MAX_SUPPORTING_FILES) {
          skipped.push({ file, reason: "count" });
          continue;
        }

        if (file.size > MAX_SUPPORTING_FILE_BYTES) {
          skipped.push({ file, reason: "size" });
          continue;
        }

        const nextTotal = merged.reduce((sum, existingFile) => sum + existingFile.size, 0) + file.size;
        if (nextTotal > MAX_SUPPORTING_TOTAL_BYTES) {
          skipped.push({ file, reason: "total" });
          continue;
        }

        merged.push(file);
      }

      return { files: merged, skipped };
    }

    const CROP_RATIOS = {
      "4-5": { w: 4, h: 5 },
      "7-5": { w: 7, h: 5 },
    };
    const CROP_EXPORT_LONG_EDGE = 2000;
    const CROP_FRAME_MIN = 140;
    const CROP_FRAME_MAX = 320;
    const CROP_FRAME_DEFAULT = 256;
    const cropOverlay = document.getElementById("submit-crop");
    const cropStage = document.getElementById("submit-crop-stage");
    const cropFrame = document.getElementById("submit-crop-frame");
    const cropImage = document.getElementById("submit-crop-image");
    const cropProgress = document.getElementById("submit-crop-progress");
    const cropZoomInput = document.getElementById("submit-crop-zoom");
    const cropApplyBtn = document.getElementById("submit-crop-apply");
    const cropRotateBtn = document.getElementById("submit-crop-rotate");
    const cropCloseBtn = document.getElementById("submit-crop-close");
    const cropCanvas = document.createElement("canvas");
    let cropQueue = [];
    let cropBatchTotal = 0;
    let currentCropFile = null;
    let cropRatioKey = "4-5";
    let cropFrameW = CROP_FRAME_DEFAULT;
    let cropFrameH = Math.round(CROP_FRAME_DEFAULT / (4 / 5));
    let cropFrameX = 0;
    let cropFrameY = 0;
    let cropBaseScale = 1;
    let cropZoom = 1;
    let imageX = 0;
    let imageY = 0;
    let cropObjectUrl = null;
    let cropDragMode = null;
    let cropResizeHandle = null;
    let cropDragStart = { x: 0, y: 0, frameX: 0, frameY: 0 };
    let cropResizeStart = {
      x: 0,
      y: 0,
      width: CROP_FRAME_DEFAULT,
      height: Math.round(CROP_FRAME_DEFAULT / (4 / 5)),
      frameX: 0,
      frameY: 0,
    };
    let pendingCropErrors = [];

    function getCropAspect() {
      const ratio = CROP_RATIOS[cropRatioKey];
      return ratio.w / ratio.h;
    }

    function getStageSize() {
      return {
        w: cropStage?.clientWidth || 0,
        h: cropStage?.clientHeight || 0,
      };
    }

    function getCropFrameMax() {
      const stage = getStageSize();
      const img = getImageBounds();
      let maxW = Math.min(stage.w || CROP_FRAME_MAX, CROP_FRAME_MAX);
      if (img) maxW = Math.min(maxW, img.w);
      return Math.max(CROP_FRAME_MIN, maxW);
    }

    function getDisplayScale() {
      return cropBaseScale * cropZoom;
    }

    function applyFrameGeometry() {
      if (!cropFrame) return;
      cropFrameW = Math.round(cropFrameW);
      cropFrameH = Math.round(cropFrameW / getCropAspect());
      cropFrame.style.width = `${cropFrameW}px`;
      cropFrame.style.height = `${cropFrameH}px`;
      cropFrame.style.left = `${cropFrameX}px`;
      cropFrame.style.top = `${cropFrameY}px`;
      cropFrame.dataset.ratio = cropRatioKey;
    }

    function getImageBounds() {
      if (!cropImage?.naturalWidth) return null;
      const scale = getDisplayScale();
      return {
        x: imageX,
        y: imageY,
        w: cropImage.naturalWidth * scale,
        h: cropImage.naturalHeight * scale,
      };
    }

    function positionImageCentered() {
      const stage = getStageSize();
      if (!cropImage?.naturalWidth || !stage.w) return;

      const scale = getDisplayScale();
      const imgW = cropImage.naturalWidth * scale;
      const imgH = cropImage.naturalHeight * scale;
      imageX = (stage.w - imgW) / 2;
      imageY = (stage.h - imgH) / 2;
    }

    function clampFrameBounds() {
      const stage = getStageSize();
      const img = getImageBounds();
      if (!stage.w || !img) return;

      const maxW = Math.max(
        CROP_FRAME_MIN,
        Math.min(getCropFrameMax(), img.w, stage.w)
      );
      cropFrameW = Math.max(CROP_FRAME_MIN, Math.min(cropFrameW, maxW));
      cropFrameH = Math.round(cropFrameW / getCropAspect());

      if (cropFrameH > img.h) {
        cropFrameH = Math.round(img.h);
        cropFrameW = Math.round(cropFrameH * getCropAspect());
      }
      if (cropFrameH > stage.h) {
        cropFrameH = stage.h;
        cropFrameW = Math.round(cropFrameH * getCropAspect());
      }

      const minX = Math.max(0, img.x);
      const maxX = Math.min(stage.w - cropFrameW, img.x + img.w - cropFrameW);
      const minY = Math.max(0, img.y);
      const maxY = Math.min(stage.h - cropFrameH, img.y + img.h - cropFrameH);

      if (minX <= maxX) {
        cropFrameX = Math.max(minX, Math.min(cropFrameX, maxX));
      } else {
        cropFrameX = img.x + (img.w - cropFrameW) / 2;
      }

      if (minY <= maxY) {
        cropFrameY = Math.max(minY, Math.min(cropFrameY, maxY));
      } else {
        cropFrameY = img.y + (img.h - cropFrameH) / 2;
      }
    }

    function layoutCropImage() {
      if (!cropImage?.naturalWidth) return;

      cropZoom = Math.max(1, cropZoom);
      if (cropZoomInput) cropZoomInput.value = String(cropZoom);
      clampFrameBounds();
      applyFrameGeometry();
      const scale = getDisplayScale();
      cropImage.style.width = `${cropImage.naturalWidth * scale}px`;
      cropImage.style.height = `${cropImage.naturalHeight * scale}px`;
      cropImage.style.left = `${imageX}px`;
      cropImage.style.top = `${imageY}px`;
      cropImage.style.transform = "";
    }

    function centerFrameOnImage() {
      const img = getImageBounds();
      if (!img) return;
      cropFrameX = Math.round(img.x + (img.w - cropFrameW) / 2);
      cropFrameY = Math.round(img.y + (img.h - cropFrameH) / 2);
      clampFrameBounds();
    }

    function captureCropState() {
      const metrics = getCropExportMetrics();
      if (!metrics) return null;
      return {
        ratioKey: cropRatioKey,
        zoom: cropZoom,
        sx: metrics.sx,
        sy: metrics.sy,
        sw: metrics.sw,
        sh: metrics.sh,
      };
    }

    function applyCropRestore(state) {
      const stage = getStageSize();
      const nw = cropImage.naturalWidth;
      const nh = cropImage.naturalHeight;
      if (!stage.w || !stage.h || !nw || !nh || !state) return false;

      cropRatioKey = state.ratioKey === "7-5" ? "7-5" : "4-5";
      cropZoom = Math.max(1, Number(state.zoom) || 1);
      if (cropZoomInput) cropZoomInput.value = String(cropZoom);

      cropBaseScale = Math.min(stage.w / nw, stage.h / nh);
      positionImageCentered();

      const scale = getDisplayScale();
      cropFrameW = Math.round(state.sw * scale);
      cropFrameH = Math.round(state.sh * scale);
      cropFrameX = Math.round(imageX + state.sx * scale);
      cropFrameY = Math.round(imageY + state.sy * scale);

      clampFrameBounds();
      layoutCropImage();
      return true;
    }

    function initCropLayout() {
      if (!cropStage || !cropImage?.naturalWidth) return;

      const stage = getStageSize();
      if (!stage.w || !stage.h) {
        window.requestAnimationFrame(initCropLayout);
        return;
      }

      if (pendingCropRestore && applyCropRestore(pendingCropRestore)) {
        pendingCropRestore = null;
        return;
      }
      pendingCropRestore = null;

      const nw = cropImage.naturalWidth;
      const nh = cropImage.naturalHeight;
      cropRatioKey = "4-5";
      cropZoom = 1;
      if (cropZoomInput) cropZoomInput.value = "1";

      cropBaseScale = Math.min(stage.w / nw, stage.h / nh);
      positionImageCentered();

      cropFrameW = Math.min(CROP_FRAME_DEFAULT, getCropFrameMax());
      cropFrameH = Math.round(cropFrameW / getCropAspect());
      centerFrameOnImage();
      layoutCropImage();
    }

    function resetCropTransform() {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(initCropLayout);
      });
    }

    function rotateCropAspect() {
      const centerX = cropFrameX + cropFrameW / 2;
      const centerY = cropFrameY + cropFrameH / 2;
      cropRatioKey = cropRatioKey === "4-5" ? "7-5" : "4-5";
      cropFrameH = Math.round(cropFrameW / getCropAspect());
      cropFrameX = Math.round(centerX - cropFrameW / 2);
      cropFrameY = Math.round(centerY - cropFrameH / 2);
      clampFrameBounds();
      layoutCropImage();
    }

    function getCropExportMetrics() {
      if (!cropImage?.naturalWidth) return null;
      const scale = getDisplayScale();
      const nw = cropImage.naturalWidth;
      const nh = cropImage.naturalHeight;
      let sx = (cropFrameX - imageX) / scale;
      let sy = (cropFrameY - imageY) / scale;
      let sw = cropFrameW / scale;
      let sh = cropFrameH / scale;

      sx = Math.max(0, sx);
      sy = Math.max(0, sy);
      sw = Math.min(sw, nw - sx);
      sh = Math.min(sh, nh - sy);

      if (sw <= 0 || sh <= 0) return null;

      return { scale, sx, sy, sw, sh };
    }

    function revokeCropObjectUrl() {
      if (!cropObjectUrl) return;
      URL.revokeObjectURL(cropObjectUrl);
      cropObjectUrl = null;
    }

    function closeCropModal() {
      if (!cropOverlay) return;
      onCropPointerEnd();
      cropOverlay.hidden = true;
      cropOverlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      cropDragMode = null;
      cropResizeHandle = null;
      currentCropFile = null;
      revokeCropObjectUrl();
      if (cropImage) {
        cropImage.removeAttribute("src");
        cropImage.style.width = "";
        cropImage.style.height = "";
        cropImage.style.left = "";
        cropImage.style.top = "";
        cropImage.style.transform = "";
      }
      cropStage?.classList.remove("is-dragging", "is-resizing");
    }

    function finishCropQueue() {
      closeCropModal();
      pendingCropErrors = [];
    }

    function cancelCropFlow() {
      if (recropBackup) {
        const { file, originalSource, index } = recropBackup;
        const next = [...selectedSupportingFiles];
        const restoreAt = Number.isInteger(index)
          ? Math.min(Math.max(index, 0), next.length)
          : next.length;
        next.splice(restoreAt, 0, file);
        selectedSupportingFiles = next;
        if (originalSource) {
          supportingOriginalFiles.set(filePreviewKey(file), originalSource);
        }
        recropBackup = null;
        syncSupportingFilesUI();
      }
      cropQueue = [];
      cropBatchTotal = 0;
      pendingCropErrors = [];
      finishCropQueue();
    }

    function openCropModal(file) {
      if (!cropOverlay || !cropImage || !file) return;

      currentCropFile = file;
      revokeCropObjectUrl();
      cropObjectUrl = URL.createObjectURL(file);
      cropImage.src = cropObjectUrl;

      const current = cropBatchTotal - cropQueue.length;
      if (cropProgress) {
        cropProgress.textContent =
          cropBatchTotal > 1
            ? `Image ${current} of ${cropBatchTotal}. Drag the crop box to reposition, drag corners to resize, rotate for landscape.`
            : "Drag the crop box to reposition, drag corners to resize, rotate for landscape.";
      }

      cropOverlay.hidden = false;
      cropOverlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      const onLoad = () => {
        cropImage.removeEventListener("load", onLoad);
        resetCropTransform();
      };

      if (cropImage.complete && cropImage.naturalWidth) {
        onLoad();
      } else {
        cropImage.addEventListener("load", onLoad);
      }
    }

    function exportCroppedFile() {
      return new Promise((resolve, reject) => {
        const metrics = getCropExportMetrics();
        const ratio = CROP_RATIOS[cropRatioKey];
        if (!metrics || !ratio || !cropImage) {
          reject(new Error("Crop unavailable"));
          return;
        }

        let exportW;
        let exportH;
        if (ratio.w >= ratio.h) {
          exportW = CROP_EXPORT_LONG_EDGE;
          exportH = Math.round(CROP_EXPORT_LONG_EDGE * (ratio.h / ratio.w));
        } else {
          exportH = CROP_EXPORT_LONG_EDGE;
          exportW = Math.round(CROP_EXPORT_LONG_EDGE * (ratio.w / ratio.h));
        }

        cropCanvas.width = exportW;
        cropCanvas.height = exportH;
        const ctx = cropCanvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Crop unavailable"));
          return;
        }

        ctx.drawImage(
          cropImage,
          metrics.sx,
          metrics.sy,
          metrics.sw,
          metrics.sh,
          0,
          0,
          exportW,
          exportH
        );

        cropCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Crop failed"));
              return;
            }
            const baseName = currentCropFile?.name.replace(/\.[^.]+$/, "") || "image";
            resolve(
              new File([blob], `${baseName}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          0.9
        );
      });
    }

    function processNextCrop() {
      if (!cropQueue.length) {
        finishCropQueue();
        return;
      }
      openCropModal(cropQueue.shift());
    }

    function enqueueFilesForCrop(incoming) {
      pendingCropErrors = [];
      const available = MAX_SUPPORTING_FILES - selectedSupportingFiles.length;

      if (available <= 0) {
        syncSupportingFilesUI({ errorMessage: supportingFileErrors.count });
        return;
      }

      const accepted = [];
      const skipped = [];

      incoming.forEach((file) => {
        if (accepted.length >= available) {
          skipped.push({ file, reason: "count" });
          return;
        }
        if (!file.type.startsWith("image/")) {
          skipped.push({ file, reason: "generic" });
          return;
        }
        if (file.size > MAX_SUPPORTING_FILE_BYTES) {
          skipped.push({ file, reason: "size" });
          return;
        }
        accepted.push(file);
      });

      if (skipped.length) {
        pendingCropErrors.push(skippedFilesMessage(skipped));
      }

      if (!accepted.length) {
        syncSupportingFilesUI({ errorMessage: pendingCropErrors[0] || "" });
        return;
      }

      cropQueue = accepted;
      cropBatchTotal = accepted.length;
      pendingCropRestore = null;
      processNextCrop();
    }

    function getResizeDelta(clientX, clientY) {
      const dx = clientX - cropResizeStart.x;
      const dy = clientY - cropResizeStart.y;

      switch (cropResizeHandle) {
        case "se":
          return (dx + dy) / 2;
        case "nw":
          return (-dx - dy) / 2;
        case "ne":
          return (dx - dy) / 2;
        case "sw":
          return (-dx + dy) / 2;
        default:
          return 0;
      }
    }

    function applyFrameResize(clientX, clientY) {
      const delta = getResizeDelta(clientX, clientY);
      let newW = Math.round(
        Math.max(CROP_FRAME_MIN, Math.min(getCropFrameMax(), cropResizeStart.width + delta))
      );
      let newH = Math.round(newW / getCropAspect());
      let newX = cropResizeStart.frameX;
      let newY = cropResizeStart.frameY;

      switch (cropResizeHandle) {
        case "nw":
          newX = cropResizeStart.frameX + (cropResizeStart.width - newW);
          newY = cropResizeStart.frameY + (cropResizeStart.height - newH);
          break;
        case "ne":
          newY = cropResizeStart.frameY + (cropResizeStart.height - newH);
          break;
        case "sw":
          newX = cropResizeStart.frameX + (cropResizeStart.width - newW);
          break;
        default:
          break;
      }

      const stage = getStageSize();
      const img = getImageBounds();
      if (newH > stage.h) {
        newH = stage.h;
        newW = Math.round(newH * getCropAspect());
      }
      if (newW > stage.w) {
        newW = stage.w;
        newH = Math.round(newW / getCropAspect());
      }
      if (img) {
        newW = Math.min(newW, img.w);
        newH = Math.round(newW / getCropAspect());
        if (newH > img.h) {
          newH = img.h;
          newW = Math.round(newH * getCropAspect());
        }
      }

      cropFrameW = newW;
      cropFrameX = newX;
      cropFrameY = newY;
      layoutCropImage();
    }

    function onCropPointerMove(event) {
      if (!cropDragMode) return;

      if (cropDragMode === "pan") {
        cropFrameX = cropDragStart.frameX + (event.clientX - cropDragStart.x);
        cropFrameY = cropDragStart.frameY + (event.clientY - cropDragStart.y);
        layoutCropImage();
        return;
      }

      if (cropDragMode === "resize") {
        applyFrameResize(event.clientX, event.clientY);
      }
    }

    function onCropPointerEnd() {
      endCropInteraction();
      document.removeEventListener("pointermove", onCropPointerMove);
      document.removeEventListener("pointerup", onCropPointerEnd);
      document.removeEventListener("pointercancel", onCropPointerEnd);
    }

    function startCropPointerSession() {
      document.addEventListener("pointermove", onCropPointerMove);
      document.addEventListener("pointerup", onCropPointerEnd);
      document.addEventListener("pointercancel", onCropPointerEnd);
    }

    function endCropInteraction() {
      cropDragMode = null;
      cropResizeHandle = null;
      cropStage?.classList.remove("is-dragging", "is-resizing");
      cropFrame?.classList.remove("is-dragging");
    }

    cropFrame?.querySelectorAll(".submitCrop__handle").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        if (cropOverlay?.hidden !== false) return;
        event.preventDefault();
        event.stopPropagation();
        cropDragMode = "resize";
        cropResizeHandle = handle.dataset.handle || "se";
        cropResizeStart = {
          x: event.clientX,
          y: event.clientY,
          width: cropFrameW,
          height: cropFrameH,
          frameX: cropFrameX,
          frameY: cropFrameY,
        };
        cropStage?.classList.add("is-resizing");
        try {
          handle.setPointerCapture(event.pointerId);
        } catch (_err) {
          // ignore
        }
        startCropPointerSession();
      });
    });

    function startCropPan(event) {
      if (cropOverlay?.hidden !== false) return;
      if (event.target.closest(".submitCrop__handle")) return;

      cropDragMode = "pan";
      cropDragStart = {
        x: event.clientX,
        y: event.clientY,
        frameX: cropFrameX,
        frameY: cropFrameY,
      };
      cropStage?.classList.add("is-dragging");
      cropFrame?.classList.add("is-dragging");
      startCropPointerSession();
      event.preventDefault();
    }

    cropFrame?.addEventListener("pointerdown", (event) => {
      startCropPan(event);
      event.stopPropagation();
    });
    cropStage?.addEventListener("pointerdown", startCropPan);

    cropZoomInput?.addEventListener("input", () => {
      cropZoom = Number(cropZoomInput.value) || 1;
      positionImageCentered();
      layoutCropImage();
    });

    cropRotateBtn?.addEventListener("click", rotateCropAspect);

    cropCloseBtn?.addEventListener("click", cancelCropFlow);

    cropApplyBtn?.addEventListener("click", async () => {
      if (!currentCropFile) return;

      cropApplyBtn.disabled = true;
      const sourceFile = currentCropFile;
      try {
        layoutCropImage();
        const cropState = captureCropState();
        const cropped = await exportCroppedFile();
        const recropIndex = recropBackup?.index;
        let saved = false;

        if (Number.isInteger(recropIndex)) {
          const next = [...selectedSupportingFiles];
          next.splice(recropIndex, 0, cropped);
          const result = validateSupportingFiles(next);
          if (!result.valid) {
            pendingCropErrors.push(result.message || supportingFileErrors.generic);
          } else {
            selectedSupportingFiles = next;
            saved = true;
          }
        } else {
          const { files, skipped } = addSupportingFiles(selectedSupportingFiles, [cropped]);
          selectedSupportingFiles = files;
          if (skipped.length) {
            pendingCropErrors.push(skippedFilesMessage(skipped));
          } else {
            saved = true;
          }
        }

        if (saved) {
          const croppedKey = filePreviewKey(cropped);
          if (Number.isInteger(recropIndex) && recropBackup) {
            const rootOriginal =
              recropBackup.originalSource ||
              supportingOriginalFiles.get(filePreviewKey(recropBackup.file));
            if (rootOriginal) {
              supportingOriginalFiles.set(croppedKey, rootOriginal);
            }
            supportingOriginalFiles.delete(filePreviewKey(recropBackup.file));
            supportingCropStates.delete(filePreviewKey(recropBackup.file));
          } else if (sourceFile) {
            supportingOriginalFiles.set(croppedKey, sourceFile);
          }
          if (cropState) {
            supportingCropStates.set(croppedKey, cropState);
          }
          recropBackup = null;
        }
        currentCropFile = null;
        syncSupportingFilesUI({ errorMessage: pendingCropErrors[0] || "" });
        processNextCrop();
      } catch {
        pendingCropErrors.push(supportingFileErrors.generic);
        currentCropFile = null;
        syncSupportingFilesUI({ errorMessage: pendingCropErrors[0] || "" });
        processNextCrop();
      } finally {
        cropApplyBtn.disabled = false;
      }
    });

    function skippedFilesMessage(skipped) {
      if (!skipped.length) return "";

      if (skipped.some((entry) => entry.reason === "size")) {
        return supportingFileErrors.size;
      }

      if (skipped.some((entry) => entry.reason === "count")) {
        return supportingFileErrors.count;
      }

      if (skipped.some((entry) => entry.reason === "total")) {
        return supportingFileErrors.total;
      }

      return supportingFileErrors.generic;
    }

    function filePreviewKey(file) {
      return `${file.name}-${file.size}-${file.lastModified}`;
    }

    function revokeSupportingPreviewUrls(exceptKeys = null) {
      const keep = exceptKeys instanceof Set ? exceptKeys : null;
      supportingPreviewUrls.forEach((url, key) => {
        if (keep?.has(key)) return;
        URL.revokeObjectURL(url);
        supportingPreviewUrls.delete(key);
        supportingPreviewFiles.delete(key);
      });
    }

    function setSupportingPreviewUrl(key, file) {
      const previousUrl = supportingPreviewUrls.get(key);
      const previousFile = supportingPreviewFiles.get(key);
      if (previousUrl && previousFile === file) {
        return previousUrl;
      }
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      const url = URL.createObjectURL(file);
      supportingPreviewUrls.set(key, url);
      supportingPreviewFiles.set(key, file);
      return url;
    }

    function removeSupportingFile(key) {
      selectedSupportingFiles = selectedSupportingFiles.filter((file) => filePreviewKey(file) !== key);
      supportingOriginalFiles.delete(key);
      supportingCropStates.delete(key);
      const previewUrl = supportingPreviewUrls.get(key);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        supportingPreviewUrls.delete(key);
        supportingPreviewFiles.delete(key);
      }
      syncSupportingFilesUI();
    }

    function reopenCropForFile(key) {
      if (cropOverlay?.hidden === false) return;

      const croppedFile = selectedSupportingFiles.find((file) => filePreviewKey(file) === key);
      if (!croppedFile) return;

      const originalSource = supportingOriginalFiles.get(key) || null;
      const cropState = supportingCropStates.get(key) || null;
      const sourceFile = originalSource || croppedFile;

      recropBackup = {
        file: croppedFile,
        originalSource,
        cropStateKey: key,
        index: selectedSupportingFiles.findIndex((file) => filePreviewKey(file) === key),
      };

      selectedSupportingFiles = selectedSupportingFiles.filter((file) => filePreviewKey(file) !== key);
      syncSupportingFilesUI();

      pendingCropRestore = cropState;
      cropQueue = [];
      cropBatchTotal = 1;
      openCropModal(sourceFile);
    }

    function renderSupportingFilePreviews(files) {
      if (!filePreviewList) return;

      const nextKeys = new Set(files.map((file) => filePreviewKey(file)));
      revokeSupportingPreviewUrls(nextKeys);
      filePreviewList.textContent = "";

      if (!files.length) {
        filePreviewList.hidden = true;
        return;
      }

      files.forEach((file) => {
        const key = filePreviewKey(file);
        const previewUrl = setSupportingPreviewUrl(key, file);

        const item = document.createElement("li");
        item.className = "submit-file-preview";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "submit-file-preview__remove";
        removeBtn.setAttribute("aria-label", "Remove image");
        removeBtn.textContent = "X";
        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          removeSupportingFile(key);
        });

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "submit-file-preview__edit";
        editBtn.setAttribute("aria-label", "Edit crop");

        const img = document.createElement("img");
        img.alt = "Selected image preview";
        img.className = "submit-file-preview__image protected-media";
        img.decoding = "async";
        img.draggable = false;
        img.src = previewUrl;
        img.addEventListener("load", () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            item.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
          }
        }, { once: true });

        editBtn.appendChild(img);
        editBtn.addEventListener("click", () => {
          reopenCropForFile(key);
        });

        item.appendChild(removeBtn);
        item.appendChild(editBtn);
        filePreviewList.appendChild(item);
      });

      filePreviewList.hidden = false;
    }

    function applySupportingFilesToInput(files) {
      if (!fileInput) return;
      suppressSupportingInputChange = true;
      try {
        const transfer = new DataTransfer();
        files.forEach((file) => transfer.items.add(file));
        fileInput.files = transfer.files;
      } finally {
        window.setTimeout(() => {
          suppressSupportingInputChange = false;
        }, 0);
      }
    }

    function updateSupportingFileButton() {
      const chooseBtn = form.querySelector(".submit-file-btn");
      if (!chooseBtn || !fileInput) return;

      const count = selectedSupportingFiles.length;
      const atMax = count >= MAX_SUPPORTING_FILES;

      if (atMax) {
        chooseBtn.textContent = "Maximum reached";
        chooseBtn.classList.add("submit-file-btn--disabled");
        chooseBtn.setAttribute("aria-disabled", "true");
        return;
      }

      chooseBtn.classList.remove("submit-file-btn--disabled");
      chooseBtn.removeAttribute("aria-disabled");
      chooseBtn.textContent = count > 0 ? "Add more images" : "Choose images";
    }

    function syncSupportingFilesUI({ errorMessage = "" } = {}) {
      if (!fileInput) return;

      const fileField = fileInput.closest(".submit-field");
      const fileError = form.querySelector('[data-error-for="supporting_images"]');
      const result = validateSupportingFiles(selectedSupportingFiles);

      applySupportingFilesToInput(selectedSupportingFiles);
      updateSupportingFileButton();
      renderSupportingFilePreviews(selectedSupportingFiles);

      if (errorMessage) {
        if (fileError) {
          fileError.textContent = errorMessage;
          fileError.hidden = false;
        }
        fileField?.classList.add("is-invalid");
        fileField?.classList.remove("is-valid");
      } else if (fileError) {
        fileError.hidden = true;
        fileField?.classList.remove("is-invalid");
      }

      if (!selectedSupportingFiles.length) {
        if (!errorMessage) {
          fileField?.classList.remove("is-valid");
        }
        return;
      }

      if (!errorMessage && result.valid) {
        fileField?.classList.add("is-valid");
      } else if (!result.valid && result.message && fileError) {
        fileError.textContent = result.message;
        fileError.hidden = false;
        fileField?.classList.add("is-invalid");
        fileField?.classList.remove("is-valid");
      }
    }

    fileInput?.addEventListener("change", () => {
      if (suppressSupportingInputChange) return;

      const incoming = [...(fileInput.files || [])];

      if (!incoming.length || (cropOverlay && cropOverlay.hidden === false)) return;

      const alreadySelected =
        incoming.length > 0 &&
        incoming.every((file) =>
          selectedSupportingFiles.some((existing) => filesAreSame(existing, file))
        );

      if (alreadySelected) return;

      fileInput.value = "";
      enqueueFilesForCrop(incoming);
    });

    form.querySelector(".submit-file-btn")?.addEventListener("click", (event) => {
      if (selectedSupportingFiles.length >= MAX_SUPPORTING_FILES) {
        event.preventDefault();
        return;
      }
      if (cropOverlay && cropOverlay.hidden === false) {
        event.preventDefault();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (currentStep !== TOTAL_STEPS) {
        return;
      }
      if (selectedSupportingFiles.length) {
        applySupportingFilesToInput(selectedSupportingFiles);
        const fileResult = validateSupportingFiles(selectedSupportingFiles);
        if (!fileResult.valid) {
          syncSupportingFilesUI({ errorMessage: fileResult.message });
          goToStep(5);
          return;
        }
      }
      if (!validateStep(7)) {
        goToStep(7);
        return;
      }

      openSubmitConfirm();
    });

    function openSubmitConfirm() {
      if (!submitConfirm) return;
      submitConfirm.hidden = false;
      submitConfirm.setAttribute("aria-hidden", "false");
      submitConfirmProceed?.focus();
    }

    function closeSubmitConfirm() {
      if (!submitConfirm) return;
      submitConfirm.hidden = true;
      submitConfirm.setAttribute("aria-hidden", "true");
      submitBtn?.focus();
    }

    async function performSubmission() {
      if (signatureMode === "draw" && signatureCanvas && !isCanvasBlank(signatureCanvas)) {
        signatureImageField.value = signatureCanvas.toDataURL("image/png");
      }

      submitBtn.disabled = true;
      if (submitConfirmProceed) submitConfirmProceed.disabled = true;

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error("Submit failed");
        }

        showSubmissionSuccess();
      } catch {
        submitBtn.disabled = false;
        if (submitConfirmProceed) submitConfirmProceed.disabled = false;
        window.alert("Something went wrong sending your submission. Please try again.");
      }
    }

    submitConfirmProceed?.addEventListener("click", () => {
      closeSubmitConfirm();
      performSubmission();
    });

    submitConfirmCancel?.addEventListener("click", closeSubmitConfirm);
    submitConfirmClose?.addEventListener("click", closeSubmitConfirm);
    submitConfirmBackdrop?.addEventListener("click", closeSubmitConfirm);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || submitConfirm?.hidden !== false) return;
      closeSubmitConfirm();
    });

    const shouldRestoreDraft = shouldRestoreSubmitDraft();
    markSubmitPageActive();
    if (shouldRestoreDraft && restoreDraft()) {
      // Draft restored from storage.
    } else {
      updateUI();
    }
  }

  let defaultHomeSeo = null;

  function captureDefaultHomeSeo() {
    if (defaultHomeSeo) return defaultHomeSeo;
    defaultHomeSeo = {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || "",
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || "",
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || "",
      ogUrl: document.querySelector('meta[property="og:url"]')?.content || "",
      twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content || "",
      twitterDescription: document.querySelector('meta[name="twitter:description"]')?.content || "",
    };
    return defaultHomeSeo;
  }

  function setMetaContent(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach((el) => {
      el.setAttribute("content", value);
    });
  }

  function applySeo({ title, description, canonical, ogTitle, ogDescription, ogUrl, twitterTitle, twitterDescription }) {
    if (title) document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', ogTitle || title);
    setMetaContent('meta[property="og:description"]', ogDescription || description);
    setMetaContent('meta[property="og:url"]', ogUrl || canonical);
    setMetaContent('meta[name="twitter:title"]', twitterTitle || ogTitle || title);
    setMetaContent('meta[name="twitter:description"]', twitterDescription || ogDescription || description);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    if (canonical || ogUrl) canonicalEl.href = ogUrl || canonical;
  }

  function initDynamicSeo() {
    if (document.body.dataset.page !== "home") return;

    const defaults = captureDefaultHomeSeo();
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("viewer") || window.history.state?.viewer;

    if (!slug || typeof getDadBySlug !== "function") {
      applySeo(defaults);
      return;
    }

    const dad = getDadBySlug(slug);
    if (!dad) {
      applySeo(defaults);
      return;
    }

    const imageIndex = Number(params.get("image") || window.history.state?.image || 0);
    const title = `${dad.name} — dadda?`;
    const description =
      dad.excerpt ||
      "A story from dadda?, a multimedia exhibition about single fatherhood.";
    const url = buildProfileShareUrl(slug, imageIndex);

    applySeo({
      title,
      description,
      canonical: url,
      ogTitle: title,
      ogDescription: description,
      ogUrl: url,
      twitterTitle: title,
      twitterDescription: description,
    });
  }

  function initSubmitHeaderScroll() {
    if (document.body.dataset.page !== "submit") return;

    const header = document.querySelector(".site-header");
    if (!header) return;

    function elementOverlapsHeader(el) {
      if (!el || el.hidden) return false;
      const headerRect = header.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) return false;
      return rect.top < headerRect.bottom && rect.bottom > headerRect.top;
    }

    function getOverlapTargets() {
      return [
        document.getElementById("submit-intro"),
        ...document.querySelectorAll(
          ".submit-step:not([hidden]), .submit-step--success:not([hidden])"
        ),
      ].filter(Boolean);
    }

    function update() {
      const hasOverlap =
        window.scrollY > 0 && getOverlapTargets().some(elementOverlapsHeader);
      document.body.classList.toggle("is-scrolled", hasOverlap);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  function initSubmitReleaseLinks() {
    if (document.body.dataset.page !== "submit") return;

    const releaseEl = document.getElementById("submit-release");
    const submitForm = document.getElementById("submit-form");
    if (!submitForm) return;

    submitForm.addEventListener("click", (event) => {
      const releaseAnchor = event.target.closest('a[href="#submit-release"]');
      if (!releaseAnchor) return;

      event.preventDefault();
      releaseEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      releaseEl?.focus();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initImageProtection();
    versionInternalLinks();
    markActiveNav();
    bindFadeNavigation();
    initPageEnter();
    initDynamicSeo();
    window.addEventListener("popstate", initDynamicSeo);
    initAboutOverlay();
    initSubmitDraftAbandon();
    initSubmitForm();
    initSubmitHeaderScroll();
    initSubmitReleaseLinks();

    const openViewer = initSlideViewer();
    if (document.body.dataset.page === "home" && !isDadsArchiveLive()) {
      initPrelaunchHome();
    } else if (openViewer) {
      initArchiveGrid(openViewer);
      initRandomShortcut(openViewer);
    }

    initDadPage();
  });
})();
