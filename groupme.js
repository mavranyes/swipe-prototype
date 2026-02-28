// Helper functions (copied from app.js)
const PLACEHOLDER_IMAGE = "./public/images/placeholder.svg";

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
      id: record.id ?? record.user_id ?? `profile-${index}`,
      name: record.name ?? record.nickname ?? "Unnamed",
      nickname: record.nickname ?? record.name ?? "",
      imageUrl: record.image_url ?? record.image ?? record.imageUrl ?? PLACEHOLDER_IMAGE,
      image_url: record.image_url ?? record.image ?? record.imageUrl ?? PLACEHOLDER_IMAGE,
      roles: Array.isArray(record.roles) ? record.roles : []
    }))
    .filter((profile) => Boolean(profile.name));
}

function shuffle(array) {
  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function serializeProfiles(profiles) {
  // Convert profiles back to loose JSON format similar to peopleData.json
  return profiles.map(p => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname,
    image_url: p.image_url,
    roles: p.roles
  })).reduce((acc, profile, index) => {
    if (index === 0) return JSON.stringify(profile);
    return acc + ",\n" + JSON.stringify(profile);
  }, "");
}

// Storage helpers - defined here so they work on groupme.html without app.js
const PROFILES_STORAGE_KEY = "profilesData";

function saveProfilesToStorage(profiles) {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    console.log(`Saved ${profiles.length} profiles to browser storage`);
    return true;
  } catch (error) {
    console.error("Failed to save profiles to storage", error);
    return false;
  }
}

function clearProfilesStorage() {
  try {
    localStorage.removeItem(PROFILES_STORAGE_KEY);
    console.log("Cleared profiles from browser storage");
    return true;
  } catch (error) {
    console.error("Failed to clear profiles storage", error);
    return false;
  }
}

// Make storage functions available globally
window.saveProfilesToStorage = saveProfilesToStorage;
window.clearProfilesStorage = clearProfilesStorage;
window.PROFILES_STORAGE_KEY = PROFILES_STORAGE_KEY;

// DOM Elements
const tokenInput = document.getElementById("token-input");
const fetchGroupsBtn = document.getElementById("fetch-groups-btn");
const groupsSection = document.getElementById("groups-section");
const groupsList = document.getElementById("groups-list");
const mergeSection = document.getElementById("merge-section");
const importBtn = document.getElementById("import-btn");
const resultsSection = document.getElementById("results-section");
const resultsMessage = document.getElementById("results-message");
const downloadContainer = document.getElementById("download-container");
const mergeStrategyRadios = document.querySelectorAll('input[name="merge-strategy"]');

// State
let selectedGroupId = null;
let selectedGroupName = null;
let fetchedMembers = [];

// Event Listeners
fetchGroupsBtn.addEventListener("click", handleFetchGroups);
importBtn.addEventListener("click", handleImport);

mergeStrategyRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    // Update state when merge strategy changes
  });
});

async function handleFetchGroups() {
  const token = tokenInput.value.trim();

  if (!token) {
    showError("Please enter a token.");
    return;
  }

  fetchGroupsBtn.disabled = true;
  fetchGroupsBtn.innerHTML = '<span class="spinner"></span> Fetching...';

  try {
    const groups = await fetchGroups(token);

    if (!groups || groups.length === 0) {
      showError("No groups found. Check your token and try again.");
      return;
    }

    renderGroupsList(groups, token);
    groupsSection.classList.remove("hidden");
    mergeSection.classList.add("hidden");
    resultsSection.classList.add("hidden");
  } catch (error) {
    showError(`Failed to fetch groups: ${error.message}`);
  } finally {
    fetchGroupsBtn.disabled = false;
    fetchGroupsBtn.textContent = "Fetch Groups";
  }
}

async function fetchGroups(token) {
  const response = await fetch(`https://api.groupme.com/v3/groups?token=${encodeURIComponent(token)}`);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid token. Check your GroupMe access token.");
    }
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || [];
}

async function fetchGroupMembers(groupId, token) {
  const response = await fetch(`https://api.groupme.com/v3/groups/${groupId}?token=${encodeURIComponent(token)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch group members: ${response.status}`);
  }

  const data = await response.json();
  const group = data.response;

  if (!group || !group.members) {
    throw new Error("No members found in this group.");
  }

  return group.members;
}

function renderGroupsList(groups, token) {
  groupsList.innerHTML = "";

  groups.forEach(group => {
    const groupItem = document.createElement("div");
    groupItem.className = "group-item";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "group-selection";
    radio.value = group.id;
    radio.id = `group-${group.id}`;

    const info = document.createElement("div");
    info.className = "group-info";

    const name = document.createElement("div");
    name.className = "group-name";
    name.textContent = group.name;

    const memberCount = document.createElement("div");
    memberCount.className = "group-members";
    memberCount.textContent = `${group.members_count} member${group.members_count !== 1 ? "s" : ""}`;

    info.append(name, memberCount);

    groupItem.append(radio, info);

    groupItem.addEventListener("click", () => {
      radio.checked = true;
      selectGroup(group.id, group.name, token);
    });

    groupsList.append(groupItem);
  });
}

async function selectGroup(groupId, groupName, token) {
  selectedGroupId = groupId;
  selectedGroupName = groupName;

  importBtn.disabled = true;
  importBtn.innerHTML = '<span class="spinner"></span> Loading members...';

  try {
    fetchedMembers = await fetchGroupMembers(groupId, token);
    mergeSection.classList.remove("hidden");
    resultsSection.classList.add("hidden");
    importBtn.disabled = false;
    importBtn.textContent = "Import Members";
  } catch (error) {
    showError(`Failed to load group members: ${error.message}`);
    importBtn.disabled = false;
    importBtn.textContent = "Import Members";
  }
}

async function handleImport() {
  if (!selectedGroupId || fetchedMembers.length === 0) {
    showError("Please select a group first.");
    return;
  }

  const mergeStrategy = document.querySelector('input[name="merge-strategy"]:checked').value;

  importBtn.disabled = true;
  importBtn.innerHTML = '<span class="spinner"></span> Importing...';

  try {
    // Normalize fetched members
    const normalizedMembers = normalizeProfiles(fetchedMembers);

    let finalProfiles = normalizedMembers;

    if (mergeStrategy === "append") {
      // Load existing profiles and merge
      const existingProfiles = await loadExistingProfiles();
      finalProfiles = mergeProfiles(existingProfiles, normalizedMembers);
    }

    // Show success message
    resultsMessage.className = "result-message result-success";
    resultsMessage.textContent = `✓ Successfully imported ${normalizedMembers.length} member${normalizedMembers.length !== 1 ? "s" : ""} from "${selectedGroupName}".`;

    if (mergeStrategy === "append") {
      resultsMessage.textContent += ` Appended to existing profiles (total: ${finalProfiles.length}).`;
    } else {
      resultsMessage.textContent += ` Replaced existing profiles.`;
    }

    // Save profiles to browser storage
    if (window.saveProfilesToStorage) {
      window.saveProfilesToStorage(finalProfiles);
      resultsMessage.textContent += " Saved to browser storage.";
    }

    // Try to update the main deck if it's available
    if (window.resetDeck) {
      window.resetDeck(finalProfiles);
      resultsMessage.textContent += " The main deck is now updated!";
    }

    resultsMessage.textContent += " Redirecting to deck in 2 seconds...";

    resultsSection.classList.remove("hidden");
    
    // Clear download container and redirect after a brief delay
    downloadContainer.innerHTML = "";
    
    // Redirect to main deck after 2 seconds
    setTimeout(() => {
      window.location.href = "./index.html";
    }, 2000);
  } catch (error) {
    showError(`Import failed: ${error.message}`);
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = "Import Members";
  }
}

async function loadExistingProfiles() {
  try {
    const response = await fetch("./peopleData.json");
    if (!response.ok) throw new Error("Failed to load existing profiles");
    const text = await response.text();
    const parsed = parseLooseJson(text);
    return normalizeProfiles(parsed);
  } catch (error) {
    console.warn("Could not load existing profiles:", error);
    return [];
  }
}

function mergeProfiles(existing, incoming) {
  // Create a map of incoming profiles by ID for quick lookup
  const incomingMap = new Map();
  incoming.forEach(profile => {
    incomingMap.set(profile.id, profile);
  });

  // Keep existing profiles that aren't in incoming (by ID)
  const kept = existing.filter(profile => !incomingMap.has(profile.id));

  // Combine: existing (filtered) + new incoming
  return [...kept, ...incoming];
}

function showError(message) {
  resultsMessage.className = "result-message result-error";
  resultsMessage.textContent = `✕ ${message}`;
  resultsSection.classList.remove("hidden");
  downloadContainer.innerHTML = "";
}

// Optional: Export functions for testing or reuse
window.groupmeExport = {
  fetchGroups,
  fetchGroupMembers,
  normalizeProfiles,
  parseLooseJson,
  mergeProfiles
};
