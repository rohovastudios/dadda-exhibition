/**
 * Dad projects — each entry is one gallery + story.
 * Optional `responses: [{ prompt, text }]` for curated survey Q&A in the viewer.
 */

/** When true, every grid thumb and slide viewer image uses PLACEHOLDER_IMAGE. */
const PLACEHOLDER_MODE = true;
const PLACEHOLDER_IMAGE = "assets/placeholder.jpg";
const PLACEHOLDER_WIDTH = 835;
const PLACEHOLDER_HEIGHT = 1024;

const DAD_IMAGES = [
  "assets/archival-photo-crop.jpg",
  "assets/playground-study.jpg",
  "assets/empty-swing.jpg",
  "assets/three-plates.jpg",
  "assets/child-note.jpg",
  "assets/dadda-poster-current-art-direction.jpg",
  "assets/print102.jpg",
  "assets/ax3a5730.jpg",
  "assets/print233.jpg",
  "assets/dadda-4x5-v1.jpg",
  "assets/dadda-a2-v1.jpg",
];

const DAD_NAMES = [
  "Marcus", "David", "James", "Andre", "Chris", "Michael",
  "Daniel", "Robert", "Kevin", "Anthony", "Brian", "Eric",
  "Jason", "Ryan", "Thomas", "Carlos", "Samuel", "Joseph",
  "William", "Benjamin",
];

function galleryForIndex(index) {
  const count = 3 + (index % 4);
  const images = [];
  for (let i = 0; i < count; i += 1) {
    images.push(
      PLACEHOLDER_MODE
        ? PLACEHOLDER_IMAGE
        : DAD_IMAGES[(index + i) % DAD_IMAGES.length],
    );
  }
  return images;
}

const DADS = DAD_NAMES.map((name, index) => {
  const slug = name.toLowerCase();
  const images = galleryForIndex(index);
  return {
    slug,
    name,
    location: "Utah",
    excerpt:
      "A portrait of single fatherhood carried quietly in domestic space — routine, absence, and care.",
    story: [
      "He keeps the swing chain oiled though the seat sits empty most afternoons.",
      "The photographs hold what is remembered, defended, and left unsaid.",
      "Story and image belong together — this is one dad, many days.",
    ].join("\n\n"),
    images,
    info: {
      biography:
        "Photographed as part of <em class=\"dadda\">dadda?</em>, an exhibition about how single fatherhood is carried without spectacle.",
      contact: "Available through the exhibition archive.",
      press: "Selected press and interviews forthcoming.",
    },
  };
});

/**
 * Build home grid items by round-robin through each dad's gallery.
 * Stops at targetCount or when no more images exist across all dads.
 */
function buildGridItems(dads, targetCount) {
  const items = [];
  let round = 0;

  while (items.length < targetCount) {
    let added = false;
    for (const dad of dads) {
      if (dad.images[round]) {
        items.push({
          slug: dad.slug,
          name: dad.name,
          src: dad.images[round],
          imageIndex: round,
        });
        added = true;
        if (items.length >= targetCount) break;
      }
    }
    if (!added) break;
    round += 1;
  }

  return items;
}

function maxGridCount(dads) {
  return buildGridItems(dads, 200).length;
}

function getDadBySlug(slug) {
  return DADS.find((dad) => dad.slug === slug);
}

/** Legacy tier counts — mapped to Tyler density modes on the homepage. */
const DENSITY_TIERS = [20, 50, 100, 200];

const DENSITY_MODES = {
  farther: { label: "close", baseHeight: 65, targetCount: 200, rowGap: 36.5625 },
  closer: { label: "closer", baseHeight: 95, targetCount: 50, rowGap: 53.4375 },
  closest: { label: "closest", baseHeight: 130, targetCount: 20, rowGap: 73.125 },
};

const DENSITY_MODE_ORDER = ["farther", "closer", "closest"];
const DEFAULT_DENSITY_MODE = "closer";

const DENSITY_COLUMNS = {
  20: 3,
  50: 5,
  100: 7,
  200: 10,
};

const DENSITY_GAP = {
  20: "1rem",
  50: "0.55rem",
  100: "0.35rem",
  200: "0.25rem",
};

/** Row height multiplier per tier (height = colWidth × mult). Inverse of former cell aspect ratio. */
const DENSITY_ROW_HEIGHT_MULT = {
  20: "5 / 4",
  50: "6 / 5",
  100: "1 / 1",
  200: "5 / 6",
};
