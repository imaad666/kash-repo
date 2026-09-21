const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("file");
const previewImg = document.getElementById("preview");
const titleInput = document.getElementById("title");
const dateInput = document.getElementById("date");
const locationInput = document.getElementById("location");
const noteInput = document.getElementById("note");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

let extractedGps = null; // { lat, lon } or null

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
  // exifr builds this Date from local (naive) EXIF components in this same
  // browser, so read it back with local getters, not UTC ones.
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function checkAuth() {
  const res = await fetch("/api/me");
  if (!res.ok) {
    window.location.href = "/login.html";
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

    const [year, month, day] = dateInput.value.split("-").map(Number);
    const dateTakenIso = new Date(Date.UTC(year, month - 1, day)).toISOString();

    const finalizeRes = await fetch("/api/finalize-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId: uploadResult.public_id,
        title: titleInput.value.trim(),
        dateTaken: dateTakenIso,
        lat: extractedGps?.lat,
        lon: extractedGps?.lon,
        location: locationInput.value.trim(),
        note: noteInput.value.trim(),
      }),
    });
    if (!finalizeRes.ok) throw new Error("Couldn't save photo details");

    messageEl.textContent = "Uploaded! Redirecting…";
    messageEl.classList.add("success");
    setTimeout(() => {
      window.location.href = "/index.html";
    }, 1000);
  } catch (err) {
    console.error(err);
    messageEl.textContent = "Something went wrong during upload. Try again.";
    messageEl.classList.add("error");
    submitBtn.disabled = false;
  }
});

checkAuth();
