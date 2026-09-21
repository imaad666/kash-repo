const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("file");
const previewImg = document.getElementById("preview");
const titleInput = document.getElementById("title");
const dateInput = document.getElementById("date");
const locationInput = document.getElementById("location");
const noteInput = document.getElementById("note");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const photoListEl = document.getElementById("photoList");
const manageStatusEl = document.getElementById("manageStatus");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

let extractedGps = null;
let photosCache = [];

function humanizeFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function toDateInputValue(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToIso(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function setManageStatus(text, kind = "") {
  manageStatusEl.textContent = text;
  manageStatusEl.className = "formMessage" + (kind ? ` ${kind}` : "");
}

async function checkAuth() {
  const res = await fetch("/api/me");
  if (!res.ok) {
    window.location.href = "/login.html";
    return false;
  }
  return true;
}

async function loadPhotos() {
  setManageStatus("Loading photos…");
  photoListEl.replaceChildren();

  try {
    const res = await fetch("/api/photos");
    if (!res.ok) throw new Error("Failed to load");
    const { photos } = await res.json();
    photosCache = (photos || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    renderPhotoList();
    setManageStatus(photosCache.length ? `${photosCache.length} photos` : "No photos yet.");
  } catch (e) {
    console.error(e);
    setManageStatus("Couldn't load photos.", "error");
  }
}

function renderPhotoList() {
  const frag = document.createDocumentFragment();

  for (const photo of photosCache) {
    const row = document.createElement("article");
    row.className = "adminPhotoRow";
    row.dataset.id = photo.id;

    const thumb = document.createElement("img");
    thumb.className = "adminPhotoThumb";
    thumb.src = photo.src;
    thumb.alt = photo.alt || photo.title;
    thumb.loading = "lazy";

    const fields = document.createElement("div");
    fields.className = "adminPhotoFields";

    const titleField = document.createElement("div");
    titleField.className = "field";
    titleField.innerHTML = `<label>Title</label>`;
    const titleEl = document.createElement("input");
    titleEl.type = "text";
    titleEl.value = photo.title || "";
    titleEl.dataset.field = "title";
    titleField.appendChild(titleEl);

    const dateField = document.createElement("div");
    dateField.className = "field";
    dateField.innerHTML = `<label>Date</label>`;
    const dateEl = document.createElement("input");
    dateEl.type = "date";
    dateEl.value = isoToDateInput(photo.date);
    dateEl.dataset.field = "date";
    dateField.appendChild(dateEl);

    const locationField = document.createElement("div");
    locationField.className = "field";
    locationField.innerHTML = `<label>Location</label>`;
    const locationEl = document.createElement("input");
    locationEl.type = "text";
    locationEl.value = photo.location || "";
    locationEl.dataset.field = "location";
    locationField.appendChild(locationEl);

    const noteField = document.createElement("div");
    noteField.className = "field";
    noteField.innerHTML = `<label>Note</label>`;
    const noteEl = document.createElement("textarea");
    noteEl.rows = 2;
    noteEl.value = photo.note || "";
    noteEl.dataset.field = "note";
    noteField.appendChild(noteEl);

    fields.appendChild(titleField);
    fields.appendChild(dateField);
    fields.appendChild(locationField);
    fields.appendChild(noteField);

    const actions = document.createElement("div");
    actions.className = "adminPhotoActions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "authButton adminActionBtn";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => savePhoto(photo.id, row, saveBtn));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "navButton adminDangerBtn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deletePhoto(photo.id, row, deleteBtn));

    const rowStatus = document.createElement("div");
    rowStatus.className = "formMessage adminRowStatus";

    actions.appendChild(saveBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(rowStatus);

    row.appendChild(thumb);
    row.appendChild(fields);
    row.appendChild(actions);
    frag.appendChild(row);
  }

  photoListEl.replaceChildren(frag);
}

async function savePhoto(publicId, row, saveBtn) {
  const title = row.querySelector('[data-field="title"]').value.trim();
  const date = row.querySelector('[data-field="date"]').value;
  const location = row.querySelector('[data-field="location"]').value.trim();
  const note = row.querySelector('[data-field="note"]').value.trim();
  const status = row.querySelector(".adminRowStatus");

  if (!title || !date) {
    status.textContent = "Title and date are required.";
    status.className = "formMessage adminRowStatus error";
    return;
  }

  saveBtn.disabled = true;
  status.textContent = "Saving…";
  status.className = "formMessage adminRowStatus";

  try {
    const res = await fetch("/api/update-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId,
        title,
        dateTaken: dateInputToIso(date),
        location,
        note,
      }),
    });
    if (!res.ok) throw new Error("Update failed");

    status.textContent = "Saved.";
    status.className = "formMessage adminRowStatus success";

    const cached = photosCache.find((p) => p.id === publicId);
    if (cached) {
      cached.title = title;
      cached.location = location;
      cached.note = note;
      cached.date = dateInputToIso(date);
    }
  } catch (e) {
    console.error(e);
    status.textContent = "Couldn't save.";
    status.className = "formMessage adminRowStatus error";
  } finally {
    saveBtn.disabled = false;
  }
}

async function deletePhoto(publicId, row, deleteBtn) {
  const title = row.querySelector('[data-field="title"]').value.trim() || publicId;
  if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;

  deleteBtn.disabled = true;
  const status = row.querySelector(".adminRowStatus");
  status.textContent = "Deleting…";
  status.className = "formMessage adminRowStatus";

  try {
    const res = await fetch("/api/delete-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
    if (!res.ok) throw new Error("Delete failed");

    photosCache = photosCache.filter((p) => p.id !== publicId);
    row.remove();
    setManageStatus(photosCache.length ? `${photosCache.length} photos` : "No photos yet.");
  } catch (e) {
    console.error(e);
    status.textContent = "Couldn't delete.";
    status.className = "formMessage adminRowStatus error";
    deleteBtn.disabled = false;
  }
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  previewImg.src = URL.createObjectURL(file);
  previewImg.classList.remove("hidden");

  if (!titleInput.value) {
    titleInput.value = humanizeFilename(file.name);
  }

  extractedGps = null;

  try {
    const mod = await import("https://esm.sh/exifr");
    const exifr = mod?.default || mod;
    const output = await exifr.parse(file, { gps: true });

    const dateTaken = output?.DateTimeOriginal || output?.CreateDate || output?.ModifyDate;
    if (dateTaken instanceof Date && !Number.isNaN(dateTaken.getTime())) {
      dateInput.value = toDateInputValue(dateTaken);
    }

    if (typeof output?.latitude === "number" && typeof output?.longitude === "number") {
      extractedGps = { lat: output.latitude, lon: output.longitude };
    }
  } catch (e) {
    console.warn("Couldn't read EXIF data from this photo", e);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageEl.textContent = "";
  messageEl.className = "formMessage";

  const file = fileInput.files[0];
  if (!file) return;

  submitBtn.disabled = true;
  messageEl.textContent = "Uploading…";

  try {
    const sigRes = await fetch("/api/upload-signature");
    if (!sigRes.ok) throw new Error("Could not get upload permission");
    const { timestamp, signature, tags, apiKey, cloudName } = await sigRes.json();

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("api_key", apiKey);
    cloudinaryForm.append("timestamp", timestamp);
    cloudinaryForm.append("signature", signature);
    cloudinaryForm.append("tags", tags);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryForm,
    });
    if (!uploadRes.ok) throw new Error("Upload to Cloudinary failed");
    const uploadResult = await uploadRes.json();

    const finalizeRes = await fetch("/api/finalize-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId: uploadResult.public_id,
        title: titleInput.value.trim(),
        dateTaken: dateInputToIso(dateInput.value),
        lat: extractedGps?.lat,
        lon: extractedGps?.lon,
        location: locationInput.value.trim(),
        note: noteInput.value.trim(),
      }),
    });
    if (!finalizeRes.ok) throw new Error("Couldn't save photo details");

    messageEl.textContent = "Uploaded.";
    messageEl.classList.add("success");
    form.reset();
    previewImg.classList.add("hidden");
    previewImg.removeAttribute("src");
    extractedGps = null;
    await loadPhotos();
  } catch (err) {
    console.error(err);
    messageEl.textContent = "Something went wrong during upload. Try again.";
    messageEl.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});

refreshBtn.addEventListener("click", () => loadPhotos());

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (e) {
    // still leave
  }
  window.location.href = "/login.html";
});

(async () => {
  const ok = await checkAuth();
  if (!ok) return;
  await loadPhotos();
})();
