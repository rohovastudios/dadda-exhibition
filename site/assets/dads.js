/**
 * Dad projects — each entry is one subject with a gallery + story folded in.
 * Replace placeholder images and copy with final exhibition assets.
 */
const DAD_IMAGES = [
  "assets/archival-photo-crop.jpg",
  "assets/playground-study.jpg",
  "assets/empty-swing.jpg",
  "assets/three-plates.jpg",
  "assets/child-note.jpg",
  "assets/dadda-poster-current-art-direction.jpg",
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
    images.push(DAD_IMAGES[(index + i) % DAD_IMAGES.length]);
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
        "Photographed as part of dadda?, an exhibition about how single fatherhood is carried without spectacle.",
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

const DENSITY_TIERS = [20, 50, 100, 200];

const DENSITY_COLUMNS = {
  20: 3,
  50: 5,
  100: 7,
  200: 10,
};
