(function () {
  const DENSITY_STORAGE_KEY = "dadda-density-mode";
  const LEGACY_DENSITY_KEY = "dadda-grid-density";
  const NAV_KEY = "dadda-nav-intent";
  const SITE_HTML_VERSION = "65";
  const PAGE_FADE_MS = 1000;
  const OVERLAY_FADE_MS = 1000;

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

    function goToSlide(nextIndex) {
      slideIndex = (nextIndex + dad.images.length) % dad.images.length;
      renderSlides();
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
          <button type="button" id="dad-info-btn">More Info</button>
        </p>`;

      counterEl.textContent = `${slideIndex + 1} of ${dad.images.length}`;

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

    const TOTAL_STEPS = 9;
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

    let currentStep = 1;
    let signatureMode = "typed";
    let releaseScrolled = false;

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
    const fileListHint = document.getElementById("supporting-images-list");

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

    function validateStep(step) {
      let valid = true;

      if (step === 1) {
        const name = form.querySelector("#full_legal_name");
        const email = form.querySelector("#email");
        const nameOk = Boolean(name?.value.trim());
        const emailOk = Boolean(email?.value.trim()) && email.validity.valid;
        showError("full_legal_name", !nameOk);
        showError("email", !emailOk);
        if (!nameOk || !emailOk) valid = false;
      }

      if (step === 4) {
        const firstOk = validateResponseBlock(1, true);
        const secondOk = validateResponseBlock(2, false);
        const thirdOk = validateResponseBlock(3, false);
        if (!firstOk || !secondOk || !thirdOk) valid = false;
      }

      if (step === 6) {
        const consents = form.querySelectorAll("[data-consent]");
        const allChecked = [...consents].every((cb) => cb.checked);
        consents.forEach((cb) => {
          cb.closest(".submit-check")?.classList.toggle("is-invalid", !cb.checked);
        });
        showError("consent", !allChecked);
        if (!allChecked) valid = false;
      }

      if (step === 7) {
        if (!validateReleaseScroll()) valid = false;

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
      currentStep = Math.max(1, Math.min(TOTAL_STEPS, step));
      updateUI();
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
        signatureMode = tab.dataset.signatureMode;
        signatureTypeField.value = signatureMode;
        form.querySelectorAll(".submit-signature__tab").forEach((t) => {
          const active = t === tab;
          t.classList.toggle("active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        form.querySelectorAll("[data-signature-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.signaturePanel !== signatureMode;
        });
        if (signatureMode === "typed") {
          signatureTyped.setAttribute("name", "signature");
          signatureImageField.value = "";
        } else {
          signatureTyped.removeAttribute("name");
        }
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
      });
    }

    releaseEl?.addEventListener("scroll", updateReleaseScrollUI, { passive: true });
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
          }
        },
        { root: releaseEl, threshold: 1 }
      );
      releaseObserver.observe(releaseEnd);
    }

    form.querySelectorAll("[data-response-prompt]").forEach((select) => {
      select.addEventListener("change", syncPromptOptions);
    });
    syncPromptOptions();

    fileInput?.addEventListener("change", () => {
      if (!fileListHint) return;
      const names = [...(fileInput.files || [])].map((f) => f.name);
      fileListHint.textContent = names.length
        ? `${names.length} file(s) selected: ${names.join(", ")}`
        : "";
    });

    form.addEventListener("submit", (event) => {
      if (currentStep !== TOTAL_STEPS) {
        event.preventDefault();
        return;
      }
      if (!validateStep(7)) {
        event.preventDefault();
        goToStep(7);
        return;
      }
      if (signatureMode === "draw" && signatureCanvas && !isCanvasBlank(signatureCanvas)) {
        signatureImageField.value = signatureCanvas.toDataURL("image/png");
      }
    });

    updateUI();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initImageProtection();
    versionInternalLinks();
    markActiveNav();
    bindFadeNavigation();
    initPageEnter();
    initAboutOverlay();
    initSubmitForm();

    const openViewer = initSlideViewer();
    if (openViewer) {
      initArchiveGrid(openViewer);
      initRandomShortcut(openViewer);
    }

    initDadPage();
  });
})();
