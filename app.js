const photos = [
  {
    id: "hari-sing-highstreet-10jun2021",
    year: 2021,
    src: "./pics/hari_sing_highstreet_10jun2021.jpeg",
    alt: "Hari Singh Highstreet, 10 Jun 2021",
    title: "Hari Singh",
    location: "Highstreet",
    dateLabel: "10 Jun 2021",
    note: "Write your note for this photo here. (Click again to hide.)",
  },
  {
    id: "rajbagh-extension-12july2020",
    year: 2020,
    src: "./pics/rajbagh_extension_12july2020.jpeg",
    alt: "Rajbagh Extension, 12 Jul 2020",
    title: "Rajbagh Extension",
    location: "Rajbagh",
    dateLabel: "12 Jul 2020",
    note: "Write your note for this photo here. (Click again to hide.)",
  },
  {
    id: "rajbagh-extension-1jun2020",
    year: 2020,
    src: "./pics/rajbagh_extension_1jun2020.heic",
    alt: "Rajbagh Extension, 1 Jun 2020",
    title: "Rajbagh Extension",
    location: "Rajbagh",
    dateLabel: "1 Jun 2020",
    note: "Write your note for this photo here. (Click again to hide.)",
  },
];

const archiveEl = document.getElementById("archive");
const yearSelectEl = document.getElementById("yearSelect");

let openButton = null;

function uniqueYears() {
  return Array.from(new Set(photos.map((p) => p.year))).sort((a, b) => b - a);
}

function groupByYear() {
  const map = new Map();
  for (const p of photos) {
    if (!map.has(p.year)) map.set(p.year, []);
    map.get(p.year).push(p);
  }
  // stable order inside year (as provided)
  return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
}

function buildYearOptions() {
  const years = uniqueYears();
  const frag = document.createDocumentFragment();

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All years";
  frag.appendChild(allOpt);

  for (const y of years) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    frag.appendChild(opt);
  }

  yearSelectEl.replaceChildren(frag);
  yearSelectEl.value = "all";
}

function createPhotoFigure(photo) {
  const figure = document.createElement("figure");
  figure.className = "photoFigure";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "photoButton";
  btn.setAttribute("aria-expanded", "false");

  const imageWrap = document.createElement("div");
  imageWrap.className = "imageWrap";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.src = photo.src;
  img.alt = photo.alt;

  const overlay = document.createElement("div");
  overlay.className = "noteOverlay";

  const noteInner = document.createElement("div");
  noteInner.className = "noteInner";

  const noteText = document.createElement("p");
  noteText.className = "noteText";
  noteText.textContent = photo.note;

  const noteHint = document.createElement("span");
  noteHint.className = "noteHint";
  noteHint.textContent = "Click to hide note";

  noteInner.appendChild(noteText);
  noteInner.appendChild(noteHint);
  overlay.appendChild(noteInner);

  imageWrap.appendChild(img);
  imageWrap.appendChild(overlay);

  btn.appendChild(imageWrap);

  const caption = document.createElement("figcaption");
  caption.className = "caption";

  const title = document.createElement("div");
  title.className = "captionTitle";
  title.textContent = `${photo.title} / ${photo.location}`;

  const date = document.createElement("div");
  date.className = "captionDate";
  date.textContent = photo.dateLabel;

  caption.appendChild(title);
  caption.appendChild(date);

  figure.appendChild(btn);
  figure.appendChild(caption);

  btn.addEventListener("click", () => togglePhoto(btn));
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePhoto(btn);
    }
  });

  return { figure, btn };
}

function togglePhoto(btn) {
  if (openButton && openButton !== btn) {
    setOpen(openButton, false);
  }

  const isOpen = btn.classList.contains("open");
  setOpen(btn, !isOpen);
}

function setOpen(btn, shouldOpen) {
  if (shouldOpen) {
    btn.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    openButton = btn;
  } else {
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    if (openButton === btn) openButton = null;
  }
}

function buildArchive() {
  const groups = groupByYear();
  const frag = document.createDocumentFragment();

  for (const [year, yearPhotos] of groups) {
    const group = document.createElement("section");
    group.className = "yearGroup";
    group.dataset.year = String(year);

    const heading = document.createElement("h2");
    heading.className = "yearHeading";
    heading.textContent = String(year);

    group.appendChild(heading);

    for (const p of yearPhotos) {
      const { figure } = createPhotoFigure(p);
      group.appendChild(figure);
    }

    frag.appendChild(group);
  }

  archiveEl.replaceChildren(frag);
}

function applyYearFilter(year) {
  const groups = archiveEl.querySelectorAll(".yearGroup");
  for (const g of groups) {
    const shouldShow = year === "all" || g.dataset.year === String(year);
    g.classList.toggle("hidden", !shouldShow);
  }
}

function closeOpenOverlay() {
  if (!openButton) return;
  setOpen(openButton, false);
}

yearSelectEl.addEventListener("change", () => {
  closeOpenOverlay();
  applyYearFilter(yearSelectEl.value);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeOpenOverlay();
});

buildYearOptions();
buildArchive();
applyYearFilter("all");

