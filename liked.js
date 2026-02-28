const PLACEHOLDER_IMAGE = "./public/images/placeholder.svg";
const LIKED_STORAGE_KEY = "likedProfiles";

const listRoot = document.getElementById("liked-list");
const emptyState = document.getElementById("liked-empty");
const note = document.getElementById("liked-note");
const downloadButton = document.getElementById("download-likes");
const clearButton = document.getElementById("clear-likes");

let likedProfiles = [];

init();

downloadButton.addEventListener("click", () => {
  exportLikedProfiles(likedProfiles);
});

clearButton.addEventListener("click", () => {
  localStorage.removeItem(LIKED_STORAGE_KEY);
  likedProfiles = [];
  renderLikedList("Cleared local storage. Reload to fetch fallback JSON if present.");
});

async function init() {
  const stored = loadFromStorage();
  if (stored && stored.length > 0) {
    likedProfiles = stored;
    renderLikedList("Loaded liked profiles from local storage.");
    return;
  }

  try {
    const response = await fetch("./likedProfiles.json", {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const parsed = await response.json();
    if (Array.isArray(parsed)) {
      likedProfiles = parsed;
      renderLikedList("Loaded likedProfiles.json from disk.");
      return;
    }
  } catch (error) {
    console.warn("Unable to load liked profiles", error);
  }

  likedProfiles = [];
  renderLikedList("No liked profiles found yet. Swipe right in the main app to add some.");
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(LIKED_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn("Unable to parse liked profiles from storage", error);
    return null;
  }
}

function renderLikedList(message) {
  listRoot.replaceChildren();

  if (!likedProfiles || likedProfiles.length === 0) {
    listRoot.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = "You have not liked anyone yet.";
    updateControlsState();
    note.textContent = message ?? "";
    return;
  }

  likedProfiles.forEach((profile, index) => {
    const card = createLikedCard(profile, index);
    listRoot.append(card);
  });

  listRoot.hidden = false;
  emptyState.hidden = true;
  updateControlsState();
  note.textContent = message ?? "";
}

function createLikedCard(profile, index) {
  const card = document.createElement("article");
  card.className = "liked-card";
  card.tabIndex = 0;
  card.setAttribute("role", "group");
  card.setAttribute("aria-label", `${profile?.name ?? "Profile"} liked entry ${index + 1}`);

  const image = document.createElement("img");
  image.className = "liked-card__image";
  image.src = profile?.imageUrl ?? profile?.image_url ?? profile?.image ?? PLACEHOLDER_IMAGE;
  image.alt = `${profile?.name ?? "Profile"} thumbnail`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    if (image.src !== PLACEHOLDER_IMAGE) {
      image.src = PLACEHOLDER_IMAGE;
    }
  });

  const textWrap = document.createElement("div");
  textWrap.className = "liked-card__text";

  const name = document.createElement("h3");
  name.className = "liked-card__name";
  name.textContent = profile?.name ?? "Unnamed";

  const meta = document.createElement("p");
  meta.className = "liked-card__meta";
  const nickname = profile?.nickname || profile?.name_alias || profile?.handle;
  meta.textContent = nickname ? `Nickname: ${nickname}` : "";

  textWrap.append(name);
  if (meta.textContent) {
    textWrap.append(meta);
  }

  card.append(image, textWrap);
  return card;
}

function updateControlsState() {
  const disabled = !likedProfiles || likedProfiles.length === 0;
  downloadButton.disabled = disabled;
  downloadButton.setAttribute("aria-disabled", String(disabled));
  clearButton.disabled = disabled;
  clearButton.setAttribute("aria-disabled", String(disabled));
}

function exportLikedProfiles(profiles) {
  if (!profiles || profiles.length === 0) {
    return;
  }

  const blob = new Blob([JSON.stringify(profiles, null, 2)], {
    type: "application/json"
  });
  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "likedProfiles.json";
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
