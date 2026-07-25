(function () {
  const STORAGE_KEY = "dadda-grid-density";

  function getDensity() {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return DENSITY_TIERS.includes(saved) ? saved : 20;
  }

  function setDensity(value) {
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  function effectiveDensity(requested) {
    const max = maxGridCount(DADS);
    if (requested <= max) return requested;
    return DENSITY_TIERS.filter((tier) => tier <= max).pop() || 20;
  }

  function markActiveNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === page);
    });
  }

  function renderDensityControl(container, onChange) {
    const max = maxGridCount(DADS);
    container.innerHTML = "";
    DENSITY_TIERS.forEach((tier) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(tier);
      btn.dataset.density = String(tier);
      btn.disabled = tier > max;
      btn.title =
        tier > max
          ? `Need more images across dad galleries (${max} available)`
          : `${tier} images in grid`;
      btn.addEventListener("click", () => onChange(tier));
      container.appendChild(btn);
    });
  }

  function updateDensityUI(container, density) {
    container.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.density) === density);
    });
  }

  function initHomeGrid() {
    const grid = document.getElementById("home-grid");
    const densityControl = document.getElementById("density-control");
    if (!grid || !densityControl) return;

    let density = effectiveDensity(getDensity());
    setDensity(density);

    function render() {
      const items = buildGridItems(DADS, density);
      grid.style.setProperty("--grid-columns", DENSITY_COLUMNS[density] || 3);
      grid.innerHTML = items
        .map(
          (item) => `
        <a class="grid-cell" href="dad.html?slug=${encodeURIComponent(item.slug)}&amp;image=${item.imageIndex}">
          <img src="${item.src}" alt="${item.name}" loading="lazy" />
        </a>`
        )
        .join("");

      const note = document.getElementById("grid-note");
      if (note) {
        note.textContent =
          items.length < density
            ? `Showing ${items.length} of ${density} — add more images to dad galleries to fill this tier.`
            : `${items.length} images · ${DADS.length} dads`;
      }

      updateDensityUI(densityControl, density);
    }

    renderDensityControl(densityControl, (tier) => {
      density = effectiveDensity(tier);
      setDensity(density);
      render();
    });

    render();
  }

  function initDadPage() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    const dad = slug ? getDadBySlug(slug) : null;
    if (!dad) {
      document.body.innerHTML =
        '<main class="page"><p class="prose">Dad not found. <a href="index.html">Return home</a>.</p></main>';
      return;
    }

    let mode = params.get("view") === "grid" ? "grid" : "slides";
    let slideIndex = Number(params.get("image") || 0);
    if (Number.isNaN(slideIndex) || slideIndex < 0) slideIndex = 0;
    if (slideIndex >= dad.images.length) slideIndex = 0;

    const titleEl = document.getElementById("dad-title");
    const slidesEl = document.getElementById("dad-slides");
    const gridEl = document.getElementById("dad-grid");
    const infoEl = document.getElementById("dad-info");
    const counterEl = document.getElementById("dad-counter");
    const toggleSlides = document.getElementById("toggle-slides");
    const toggleGrid = document.getElementById("toggle-grid");

    titleEl.textContent = dad.name;

    function setMode(next) {
      mode = next;
      slidesEl.hidden = mode !== "slides";
      gridEl.hidden = mode !== "grid";
      toggleSlides.classList.toggle("active", mode === "slides");
      toggleGrid.classList.toggle("active", mode === "grid");
    }

    function renderSlides() {
      slidesEl.innerHTML = `
        <figure class="dad-slide">
          <img src="${dad.images[slideIndex]}" alt="${dad.name}" />
        </figure>
        <p class="dad-caption">${dad.name}</p>
        <div class="dad-actions">
          <button type="button" class="text-link" id="dad-prev">Previous</button>
          <span class="dad-divider">|</span>
          <button type="button" class="text-link" id="dad-next">Next</button>
          <span class="dad-divider">|</span>
          <button type="button" class="text-link" id="dad-info-btn">More info</button>
        </div>`;

      counterEl.textContent = `${slideIndex + 1} of ${dad.images.length}`;

      document.getElementById("dad-prev").addEventListener("click", () => {
        slideIndex = (slideIndex - 1 + dad.images.length) % dad.images.length;
        renderSlides();
      });
      document.getElementById("dad-next").addEventListener("click", () => {
        slideIndex = (slideIndex + 1) % dad.images.length;
        renderSlides();
      });
      document.getElementById("dad-info-btn").addEventListener("click", () => {
        infoEl.hidden = !infoEl.hidden;
      });
    }

    function renderGrid() {
      gridEl.innerHTML = dad.images
        .map(
          (src, index) => `
        <button type="button" class="grid-cell grid-cell--button" data-index="${index}">
          <img src="${src}" alt="${dad.name} ${index + 1}" loading="lazy" />
        </button>`
        )
        .join("");

      gridEl.querySelectorAll("[data-index]").forEach((btn) => {
        btn.addEventListener("click", () => {
          slideIndex = Number(btn.dataset.index);
          setMode("slides");
          renderSlides();
        });
      });
    }

    infoEl.innerHTML = `
      <h2>Story</h2>
      <p>${dad.story.split("\n\n").join("</p><p>")}</p>
      <h2>Biography</h2>
      <p>${dad.info.biography}</p>
      <p><strong>Location:</strong> ${dad.location}</p>`;

    toggleSlides.addEventListener("click", () => {
      setMode("slides");
    });
    toggleGrid.addEventListener("click", () => {
      setMode("grid");
    });

    renderGrid();
    renderSlides();
    setMode(mode);
  }

  document.addEventListener("DOMContentLoaded", () => {
    markActiveNav();
    initHomeGrid();
    initDadPage();
  });
})();
