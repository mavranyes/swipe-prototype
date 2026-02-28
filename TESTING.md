# Testing Guide: GroupMe Import Feature

## Pre-Test Setup

1. **Start a local HTTP server** (required for CORS):
   ```bash
   cd /path/to/GroupMe\ App
   python -m http.server 8000
   ```

2. **Prepare a GroupMe token**:
   - Visit [dev.groupme.com/applications](https://dev.groupme.com/applications)
   - Sign in (create account if needed)
   - Copy your Personal Access Token

3. **Open the app**: Visit [http://localhost:8000](http://localhost:8000)

---

## Test Scenarios

### Test 1: Main Deck Navigation
**Goal:** Verify all pages are accessible and header links are visible

**Steps:**
1. Open [http://localhost:8000](http://localhost:8000)
2. Verify header shows title "Swipe Prototype" with two links: "Liked profiles" and "Import from GroupMe"
3. Click "Import from GroupMe" → should navigate to `groupme.html`
4. On import page, verify header shows "Import from GroupMe" with "Back to deck" link
5. Click "Back to deck" → should return to `index.html`
6. Click "Liked profiles" → should navigate to `liked.html`
7. Verify "Import from GroupMe" link is visible on `liked.html`

**Expected Result:** All navigation links work; headers are consistent across pages.

---

### Test 2: Fetch Groups
**Goal:** Verify GroupMe API connection and group list rendering

**Steps:**
1. Navigate to [http://localhost:8000/groupme.html](http://localhost:8000/groupme.html)
2. Paste your personal access token into the token field
3. Click "Fetch Groups"
4. Wait for loading spinner to disappear

**Expected Result:**
- Groups list appears below the button
- Each group shows name and member count (e.g., "3 members")
- Groups are clickable/selectable

**If Error:**
- "Invalid token" → Verify token is correct and hasn't been revoked
- "No groups found" → Ensure your GroupMe account has groups
- "Failed to fetch" → Ensure running on HTTP, not `file://`

---

### Test 3: Select Group and Load Members
**Goal:** Verify member fetching and merge strategy selection

**Steps:**
1. Continue from Test 2 (have groups list displayed)
2. Click on any group
3. Wait for "Loading members..." spinner to complete
4. Verify "Merge Strategy" section appears with two radio options:
   - "Replace existing profiles with this group"
   - "Append members from this group (skip duplicates)"
5. Verify the "Import Members" button is enabled

**Expected Result:**
- Members load without errors
- Merge strategy section is visible and interactive
- Import button is enabled

---

### Test 4: Replace Strategy Import
**Goal:** Verify profiles are replaced when selecting "Replace"

**Steps:**
1. Continue from Test 3 (merge strategy visible)
2. Select "Replace existing profiles with this group" (should be default)
3. Click "Import Members"
4. Wait for success message

**Expected Result:**
- Success message appears: "✓ Successfully imported X members from '[Group Name]'. Replaced existing profiles. The main deck is now updated!"
- Download link appears: "📥 Download Updated peopleData.json"
- If main deck is open in another tab/window, navigate there and verify profiles have changed to the group members

---

### Test 5: Append Strategy Import
**Goal:** Verify profiles are merged (with duplicates skipped) when selecting "Append"

**Steps:**
1. Return to [http://localhost:8000](http://localhost:8000) (main deck should now have group members from Test 4)
2. Navigate to GroupMe import page
3. Fetch groups again (use same token)
4. Select the **same group** as before
5. Select "Append members from this group (skip duplicates)"
6. Click "Import Members"
7. Wait for success message

**Expected Result:**
- Success message shows count of members (same as before, since all are duplicates)
- Message indicates "Appended to existing profiles (total: X)" with same total as previous import
- This confirms duplicates were properly skipped

---

### Test 6: Download and Persistence
**Goal:** Verify profiles persist in browser storage automatically

**Steps:**
1. Continue from Test 5 (results displayed)
2. Verify success message includes "Saved to browser storage"
3. Refresh [http://localhost:8000](http://localhost:8000)
4. Observe that profiles are still displayed (loaded from browser storage)
5. Optionally, download the "📥 Download Updated peopleData.json" link for backup

**Expected Result:**
- Success message confirms profiles are saved to browser storage
- After page refresh, same profiles appear (no need to re-import)
- Download link works for creating backups

### Test 6b: Browser Storage Verification
**Goal:** Verify profiles are actually stored in local storage

**Steps:**
1. Open DevTools (F12)
2. Go to "Application" or "Storage" tab
3. Click "Local Storage" → your domain
4. Look for a key named `profilesData`
5. Click on it and verify the JSON contains your imported profiles

**Expected Result:**
- `profilesData` key exists and contains valid JSON array
- Profile count matches imported count
- All profile data (id, name, image_url, etc.) is present

---

### Test 7: Cross-Tab Updates
**Goal:** Verify real-time updates when import page updates main deck

**Steps:**
1. Open [http://localhost:8000](http://localhost:8000) in two browser tabs
2. Keep both tabs side-by-side
3. In Tab 2, navigate to GroupMe import page
4. Fetch groups, select a group, and import members with "Replace" strategy
5. Without refreshing Tab 1, observe the main deck

**Expected Result:**
- Tab 1 main deck updates immediately after import completes
- Profiles switch to the imported group members
- No page refresh needed (live update via `window.resetDeck()`)

---

### Test 8: Error Handling
**Goal:** Verify graceful error handling for various failure scenarios

**Test 8a: Invalid Token**
- Clear the token field and click "Fetch Groups"
- Expected: "Please enter a token" message

**Test 8b: Expired/Revoked Token**
- Use an old or revoked token and click "Fetch Groups"
- Expected: "Invalid token. Check your GroupMe access token" message

**Test 8c: Network Error (e.g., disconnect WiFi)**
- Disconnect internet after token is entered
- Click "Fetch Groups"
- Expected: Network error message in results area

**Test 8d: Empty Group**
- Select a group with 0 members (if available)
- Click "Import Members"
- Expected: Appropriate error or success with 0 members imported

---

### Test 9: Navigation After Import
**Goal:** Verify navigation flow after successful import

**Steps:**
1. Complete an import (Test 4 or 5)
2. From results page, click "Liked profiles" link in header
3. Verify you can navigate between all pages
4. Return to main deck ("Back to swipe")
5. Verify new profiles are displayed and swipeable

**Expected Result:**
- All navigation links work post-import
- Liked profiles page shows any previously liked profiles
- Main deck is fully functional with imported profiles

---

### Test 10: Merge Strategy Switching
**Goal:** Verify switching strategies between imports

**Steps:**
1. Import Group A with "Replace" strategy (10 members)
2. Main deck shows 10 profiles
3. Import Group B with "Append" strategy (8 members, 2 duplicates with Group A)
4. Main deck should show ~16 profiles (10 + 6 new)
5. Import Group C with "Replace" strategy (5 members)
6. Main deck resets to 5 profiles

**Expected Result:**
- Replace clears previous profiles each time
- Append accumulates profiles and skips duplicates
- Counts are accurate in success messages

---

### Test 11: Storage Persistence & Clearing
**Goal:** Verify browser storage works correctly and can be cleared

**Steps:**

**Part A: Persistence**
1. Import profiles from a group
2. Wait for "Saved to browser storage" message
3. Open browser DevTools (F12)
4. Go to "Application" → "Local Storage" → your domain
5. Verify `profilesData` key contains JSON array
6. Close DevTools and refresh page
7. Verify same profiles appear without re-importing

**Part B: Clearing Storage**
1. Open browser console (F12 → Console tab)
2. Run: `window.clearProfilesStorage()`
3. Refresh the page
4. Verify profiles revert to original `peopleData.json` (different from imported)

**Expected Result:**
- Profiles persist across page refreshes when stored
- `profilesData` key properly stores JSON
- Clearing storage reverts to default data
- No errors in console

---

## Performance Testing

### Test 12: Large Group Import
**Goal:** Verify performance with many members

**Steps:**
1. Select a GroupMe group with 50+ members
2. Import with either strategy
3. Time how long it takes to fetch members and render results

**Expected Result:**
- Import completes within 5-10 seconds
- No browser freezing
- All members load correctly

---

## Browser Testing

Test on:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browser (iOS Safari or Chrome Mobile)

**Verify:**
- Form inputs are accessible on small screens
- Download link works
- Header navigation is readable
- Swipe deck works after import

---

## Sign-Off Checklist

- [ ] Navigation works across all pages
- [ ] Groups fetch successfully with valid token
- [ ] Replace strategy discards old profiles
- [ ] Append strategy merges profiles and skips duplicates
- [ ] Profiles save to browser storage
- [ ] Profiles persist after page refresh
- [ ] Storage can be cleared via console
- [ ] Download link generates valid JSON
- [ ] Main deck updates without refresh
- [ ] Errors are handled gracefully
- [ ] Works on both desktop and mobile
- [ ] No console errors
- [ ] Liked count persists after import

---

## Known Limitations

1. **CORS**: Must run over HTTP due to GroupMe API CORS restrictions
2. **Token Security**: Token is entered in plaintext; for production, use OAuth
3. **No Offline Mode**: Requires internet connection for imports
4. **File Persistence**: JSON must be manually saved; no server-side persistence

---

## Reporting Issues

If tests fail, collect:
- Browser and version
- Steps to reproduce
- Console errors (F12 → Console tab)
- Network activity (F12 → Network tab)
- Screenshots/video
