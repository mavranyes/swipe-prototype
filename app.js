const appRoot = document.getElementById("app");
const PLACEHOLDER_IMAGE = "./public/images/placeholder.svg";
const SWIPE_THRESHOLD_PX = 120;
const SWIPE_VELOCITY_PX_PER_MS = 0.45;
const LIKED_STORAGE_KEY = "likedProfiles";
const PROFILES_STORAGE_KEY = "profilesData";

const state = {
  baseProfiles: [],
  profiles: [],
  currentIndex: 0,
  isAnimating: false,
  likedOrder: [],
  likedLookup: new Map()
};

const stageElements = createStage();
hydrateLikedProfiles();
window.addEventListener("keydown", handleKeydown);

renderStatusCard({
  title: "Loading profile…",
  badge: "Preparing",
  imageUrl: PLACEHOLDER_IMAGE,
  note: "Fetching people data and shuffling the deck."
});

initializeDeck();

async function loadProfiles() {
  // Check localStorage first for imported profiles
  try {
    const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`Loaded ${parsed.length} profiles from browser storage`);
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load from localStorage, falling back to peopleData.json", error);
  }

  // Fall back to peopleData.json if localStorage is empty
  const response = await fetch("./peopleData.json", {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load peopleData.json: ${response.status}`);
  }

  const text = await response.text();

  try {
    const profiles = parseLooseJson(text);
    // Save to localStorage for future loads
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    return profiles;
  } catch (error) {
    console.error("Failed to parse people data", error);
    throw error;
  }
}

function parseLooseJson(rawText) {
  // peopleData.json may not be a strict array; normalize by wrapping objects in [] if needed.
  const trimmed = rawText.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return JSON.parse(trimmed);
  }

  const wrapped = `[${trimmed.replace(/},\s*{/g, "},{")}]`;
  return JSON.parse(wrapped);
}

function normalizeProfiles(records) {
  return records
    .map((record, index) => ({
      id: record.id ?? `profile-${index}`,
      name: record.name ?? record.nickname ?? "Unnamed",
      nickname: record.nickname ?? "",
      imageUrl: record.image_url ?? record.image ?? record.imageUrl ?? PLACEHOLDER_IMAGE,
      image_url: record.image_url ?? record.image ?? record.imageUrl ?? PLACEHOLDER_IMAGE,
      roles: Array.isArray(record.roles) ? record.roles : []
    }))
    .filter((profile) => Boolean(profile.name));
}

function shuffle(array) {
  // Fisher-Yates shuffle for variety.
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function initializeDeck() {
  try {
    const rawProfiles = await loadProfiles();
    const normalizedProfiles = normalizeProfiles(rawProfiles);
    const profiles = shuffle([...normalizedProfiles]);

    state.baseProfiles = normalizedProfiles;
    state.profiles = profiles;
    state.currentIndex = 0;
    state.isAnimating = false;

    if (profiles.length === 0) {
      renderStatusCard({
        title: "No profiles found",
        badge: "Check JSON",
        imageUrl: PLACEHOLDER_IMAGE,
        note: "peopleData.json did not contain any usable entries."
      });
      return;
    }

    renderCardStack();
  } catch (error) {
    renderStatusCard({
      title: "Unable to load data",
      badge: "Error",
      imageUrl: PLACEHOLDER_IMAGE,
      note: "Check the console for details about the fetch failure."
    });
  }
}

function createStage() {
  const header = document.createElement("header");
  header.className = "app-header";

  const title = document.createElement("h1");
  title.className = "app-title";
  title.textContent = "Swipe Prototype";

  const likedLink = document.createElement("a");
  likedLink.className = "header-link";
  likedLink.href = "./liked.html";
  likedLink.textContent = "Liked profiles";
  likedLink.setAttribute("aria-label", "View liked profiles page");

  const groupmeLink = document.createElement("a");
  groupmeLink.className = "header-link";
  groupmeLink.href = "./groupme.html";
  groupmeLink.textContent = "Import from GroupMe";
  groupmeLink.setAttribute("aria-label", "Import profiles from GroupMe");

  const navLinks = document.createElement("div");
  navLinks.append(likedLink, groupmeLink);

  header.append(title, navLinks);

  const stage = document.createElement("div");
  stage.className = "swipe-stage";
  stage.setAttribute("role", "region");
  stage.setAttribute("aria-label", "Swipeable profile cards");

  const stack = document.createElement("div");
  stack.className = "card-stack";
  stage.append(stack);

  const actionBar = document.createElement("div");
  actionBar.className = "action-bar";

  const buttons = [
    createActionButton("✕", "Dismiss profile", "left", "action-button--no"),
    createActionButton(
      "🙏",
      "Prayerfully consider pursuing a courting relationship with this person",
      "right",
      "action-button--yes"
    )
  ];

  buttons.forEach((button) => actionBar.append(button));

  const note = document.createElement("p");
  note.className = "ui-note";
  note.textContent = "";
  note.setAttribute("role", "status");
  note.setAttribute("aria-live", "polite");

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "reset-button";
  resetButton.textContent = "Reset deck";
  resetButton.hidden = true;
  resetButton.setAttribute("aria-hidden", "true");
  resetButton.addEventListener("click", resetDeck);

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "export-button";
  exportButton.textContent = "Download liked profiles";
  exportButton.disabled = true;
  exportButton.setAttribute("aria-disabled", "true");
  exportButton.addEventListener("click", exportLikedProfiles);

  const secondaryActions = document.createElement("div");
  secondaryActions.className = "secondary-actions";
  secondaryActions.append(resetButton, exportButton);

  appRoot.replaceChildren(header, stage, actionBar, note, secondaryActions);

  return {
    header,
    likedLink,
    groupmeLink,
    stage,
    stack,
    actionBar,
    buttons,
    note,
    resetButton,
    exportButton
  };
}

function createActionButton(symbol, label, direction, modifierClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${modifierClass}`;
  button.setAttribute("aria-label", label);
  button.dataset.direction = direction;
  button.textContent = symbol;
  button.addEventListener("click", () => triggerSwipe(direction));
  return button;
}

function renderCardStack() {
  const { profiles, currentIndex } = state;

  if (profiles.length === 0) {
    renderStatusCard({
      title: "No profiles found",
      badge: "Check JSON",
      imageUrl: PLACEHOLDER_IMAGE,
      note: "peopleData.json did not contain any usable entries."
    });
    setResetVisible(false);
    return;
  }

  if (currentIndex >= profiles.length) {
    renderStatusCard({
      title: "Out of people",
      badge: "Reset soon",
      imageUrl: PLACEHOLDER_IMAGE,
      note: "You have reached the end of the deck."
    });
    setResetVisible(true);
    return;
  }

  const cards = [];
  const activeProfile = profiles[currentIndex];
  const activeCard = createProfileCard(activeProfile, "is-active");
  cards.push(activeCard);

  const nextProfile = profiles[currentIndex + 1];
  if (nextProfile) {
    cards.push(createProfileCard(nextProfile, "is-next"));
    preloadImage(nextProfile.imageUrl);
  }

  stageElements.stack.replaceChildren(...cards);
  attachCardInteractions(activeCard);
  requestAnimationFrame(() => {
    if (document.activeElement !== activeCard) {
      activeCard.focus({ preventScroll: true });
    }
  });

  const remaining = profiles.length - currentIndex - 1;
  const contextName = activeProfile.name ?? "this person";
  const baseMessage = `Prayerfully consider pursuing a courting relationship with ${contextName}.`;
  if (remaining > 0) {
    setNote(`${baseMessage} Swipe left to pass or tap the praying hands to express interest.`);
  } else {
    setNote(`${baseMessage} This is the last card — make your choice!`);
  }

  setActionsEnabled(true);
  setResetVisible(false);
}

function createProfileCard(profile, variant) {
  const card = document.createElement("article");
  card.className = "profile-card";
  if (variant) {
    card.classList.add(variant);
  }

  card.setAttribute("role", "group");
  const labelParts = [profile.name ?? "Unnamed"];
  if (profile.nickname) {
    labelParts.push(`nickname ${profile.nickname}`);
  }
  card.setAttribute("aria-label", labelParts.join(", "));
  card.tabIndex = variant === "is-active" || variant === "is-status" ? 0 : -1;

  if (profile.id) {
    card.dataset.profileId = String(profile.id);
  }

  const badge = document.createElement("span");
  badge.className = "card-badge";
  badge.textContent = profile.nickname ?? "";
  badge.hidden = badge.textContent.length === 0;

  const image = document.createElement("img");
  image.className = "profile-card__image";
  image.src = profile.imageUrl || PLACEHOLDER_IMAGE;
  image.alt = `${profile.name ?? "Profile"} photo`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    if (image.src !== PLACEHOLDER_IMAGE) {
      console.warn(`Falling back to placeholder for profile ${profile.id ?? profile.name ?? "unknown"}`);
      image.src = PLACEHOLDER_IMAGE;
    }
  });

  const nameHeading = document.createElement("h2");
  nameHeading.className = "profile-card__name";
  nameHeading.textContent = profile.name ?? "Unnamed";

  card.append(image, badge, nameHeading);
  return card;
}

function renderStatusCard({ title, badge, imageUrl = PLACEHOLDER_IMAGE, note }) {
  const statusCard = createProfileCard(
    {
      id: `status-${Date.now()}`,
      name: title,
      nickname: badge,
      imageUrl
    },
    "is-status"
  );

  stageElements.stack.replaceChildren(statusCard);
  setActionsEnabled(false);
  setNote(note ?? "");
}

function setNote(message) {
  stageElements.note.textContent = message;
}

function setActionsEnabled(enabled) {
  stageElements.buttons.forEach((button) => {
    button.disabled = !enabled;
    button.setAttribute("aria-disabled", String(!enabled));
  });
}

function setResetVisible(visible) {
  stageElements.resetButton.hidden = !visible;
  stageElements.resetButton.disabled = !visible;
  stageElements.resetButton.setAttribute("aria-hidden", String(!visible));
}

function attachCardInteractions(card) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  const resetTransform = () => {
    card.style.transition = "transform 180ms ease";
    card.style.transform = "";
    card.style.opacity = "";
    if (!state.isAnimating) {
      setActionsEnabled(true);
    }
    card.addEventListener(
      "transitionend",
      () => {
        if (!state.isAnimating) {
          setActionsEnabled(true);
        }
      },
      { once: true }
    );
  };

  const onPointerDown = (event) => {
    if (state.isAnimating) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = event.timeStamp;

    card.setPointerCapture(pointerId);
    card.style.transition = "none";
    setActionsEnabled(false);
  };

  const onPointerMove = (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const rotation = deltaX * 0.05;

    card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
  };

  const onPointerUp = (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    card.releasePointerCapture(pointerId);

    const deltaX = event.clientX - startX;
    const elapsed = Math.max(event.timeStamp - startTime, 1);
    const velocityX = deltaX / elapsed;

    pointerId = null;

    const shouldSwipe =
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX || Math.abs(velocityX) >= SWIPE_VELOCITY_PX_PER_MS;

    if (shouldSwipe) {
      const direction = deltaX >= 0 ? "right" : "left";
      animateCardOff(card, direction);
    } else {
      resetTransform();
    }
  };

  const onPointerCancel = (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    pointerId = null;
    card.releasePointerCapture(event.pointerId);
    resetTransform();
  };

  card.addEventListener("pointerdown", onPointerDown);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerCancel);
}

function animateCardOff(card, direction) {
  if (state.isAnimating) {
    return;
  }

  state.isAnimating = true;
  setActionsEnabled(false);

  const stageWidth = stageElements.stage.clientWidth || window.innerWidth;
  const travelX = direction === "right" ? stageWidth * 1.2 : -stageWidth * 1.2;
  const rotation = direction === "right" ? 35 : -35;

  card.style.transition = "transform 320ms cubic-bezier(0.33, 1, 0.68, 1), opacity 320ms ease";

  requestAnimationFrame(() => {
    card.style.transform = `translate(${travelX}px, 0) rotate(${rotation}deg)`;
    card.style.opacity = "0";
  });

  card.addEventListener(
    "transitionend",
    () => {
      advanceDeck(direction);
    },
    { once: true }
  );
}

function triggerSwipe(direction) {
  if (direction !== "left" && direction !== "right") {
    return;
  }

  const activeCard = stageElements.stack.querySelector(".profile-card.is-active");
  if (!activeCard) {
    return;
  }

  animateCardOff(activeCard, direction);
}

function advanceDeck(direction) {
  const swipeDirection = direction ?? "left";
  const { profiles, currentIndex } = state;
  const currentProfile = profiles[currentIndex];

  if (currentProfile && swipeDirection === "right") {
    recordLike(currentProfile);
  }

  state.currentIndex += 1;
  state.isAnimating = false;
  renderCardStack();
}

function recordLike(profile) {
  if (!profile) {
    return;
  }

  const identifier = profile.id ?? profile.name;
  if (!identifier) {
    return;
  }

  if (!state.likedLookup.has(identifier)) {
    state.likedOrder.push(identifier);
  }

  state.likedLookup.set(identifier, profile);
  persistLikedProfiles();
}

function getLikedProfiles() {
  return state.likedOrder
    .map((identifier) => state.likedLookup.get(identifier))
    .filter((entry) => Boolean(entry));
}

function toSerializableProfile(profile) {
  const image = profile.imageUrl ?? profile.image_url ?? profile.image ?? PLACEHOLDER_IMAGE;
  return {
    id: profile.id ?? null,
    name: profile.name ?? "",
    nickname: profile.nickname ?? "",
    roles: Array.isArray(profile.roles) ? profile.roles : [],
    image_url: image,
    imageUrl: image
  };
}

function normalizeStoredProfile(entry, index) {
  if (!entry) {
    return null;
  }

  const image = entry.imageUrl ?? entry.image_url ?? entry.image ?? PLACEHOLDER_IMAGE;
  return {
    id: entry.id ?? `liked-${index}`,
    name: entry.name ?? "Unnamed",
    nickname: entry.nickname ?? "",
    roles: Array.isArray(entry.roles) ? entry.roles : [],
    imageUrl: image,
    image_url: image
  };
}

function persistLikedProfiles() {
  const likedProfiles = getLikedProfiles();
  const serializable = likedProfiles.map(toSerializableProfile);
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn("Unable to persist liked profiles", error);
  }
  updateLikedUi(serializable.length);
}

function updateLikedUi(count = state.likedOrder.length) {
  if (!stageElements?.likedLink || !stageElements?.exportButton) {
    return;
  }

  const total = count;
  const label = total > 0 ? `Liked profiles (${total})` : "Liked profiles";
  stageElements.likedLink.textContent = label;
  stageElements.likedLink.setAttribute(
    "aria-label",
    total > 0 ? `View liked profiles page (${total})` : "View liked profiles page"
  );

  if (total > 0) {
    stageElements.exportButton.disabled = false;
    stageElements.exportButton.setAttribute("aria-disabled", "false");
  } else {
    stageElements.exportButton.disabled = true;
    stageElements.exportButton.setAttribute("aria-disabled", "true");
  }
}

function exportLikedProfiles() {
  const likedProfiles = getLikedProfiles();
  if (likedProfiles.length === 0) {
    return;
  }

  const blob = new Blob([JSON.stringify(likedProfiles, null, 2)], {
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

function hydrateLikedProfiles() {
  try {
    state.likedOrder.length = 0;
    state.likedLookup.clear();

    const stored = localStorage.getItem(LIKED_STORAGE_KEY);
    if (!stored) {
      updateLikedUi(0);
      return;
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      updateLikedUi(0);
      return;
    }

    parsed.forEach((entry, index) => {
      const normalized = normalizeStoredProfile(entry, index);
      if (!normalized) {
        return;
      }
      const identifier = normalized.id;
      if (!state.likedLookup.has(identifier)) {
        state.likedOrder.push(identifier);
      }
      state.likedLookup.set(identifier, normalized);
    });

    updateLikedUi(parsed.length);
  } catch (error) {
    console.warn("Unable to hydrate liked profiles", error);
    updateLikedUi(0);
  }
}

function preloadImage(src) {
  if (!src || src === PLACEHOLDER_IMAGE) {
    return;
  }

  const preloader = new Image();
  preloader.src = src;
}

function resetDeck(newProfiles) {
  // If newProfiles provided, use them as the base; otherwise use existing baseProfiles
  if (newProfiles && Array.isArray(newProfiles)) {
    state.baseProfiles = newProfiles;
  }

  if (state.baseProfiles.length === 0) {
    return;
  }

  state.profiles = shuffle([...state.baseProfiles]);
  state.currentIndex = 0;
  state.isAnimating = false;
  renderCardStack();
  setNote("Deck refreshed. Swipe away!");
}

// Export helpers to window for use from other pages
window.resetDeck = resetDeck;
window.PROFILES_STORAGE_KEY = PROFILES_STORAGE_KEY;

// Only define storage functions if not already defined (groupme.js may define them first)
if (!window.saveProfilesToStorage) {
  window.saveProfilesToStorage = function(profiles) {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      return true;
    } catch (error) {
      console.error("Failed to save profiles to storage", error);
      return false;
    }
  };
}

if (!window.clearProfilesStorage) {
  window.clearProfilesStorage = function() {
    try {
      localStorage.removeItem(PROFILES_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear profiles storage", error);
      return false;
    }
  };
}

function handleKeydown(event) {
  if (state.isAnimating) {
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft") {
    triggerSwipe("left");
  } else if (event.key === "ArrowRight") {
    triggerSwipe("right");
  }
}
