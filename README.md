# GroupMe Swipe Prototype

A lightweight, client-side swipe deck application for browsing profiles. Supports importing members directly from GroupMe groups.

## Getting Started

### 1. Run a Local HTTP Server

The GroupMe API has CORS restrictions, so you **must** serve the app over HTTP rather than `file://`.

**Using Python 3:**
```bash
cd /path/to/GroupMe\ App
python -m http.server 8000
```

**Using Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**Using Node.js (if installed):**
```bash
npx http-server
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

### 2. Get a GroupMe Personal Access Token

You'll need a personal access token to import profiles from your GroupMe groups.

1. Visit [dev.groupme.com/applications](https://dev.groupme.com/applications)
2. Sign in with your GroupMe account (create one if needed)
3. Create a new application or use the existing one
4. Copy your **Personal Access Token** from the My Access Tokens section
5. Keep this token private—it provides access to your GroupMe data

### 3. Import Profiles from GroupMe

1. Click the **"Import from GroupMe"** link in the app header
2. Paste your personal access token into the token field
3. Click **"Fetch Groups"** to load your GroupMe groups
4. Select a group from the list
5. Choose a merge strategy:
   - **Replace**: Discard existing profiles and use only this group's members
   - **Append**: Add this group's members to existing profiles (duplicates are skipped)
6. Click **"Import Members"**
7. The deck updates immediately with the new members
8. Download the updated `peopleData.json` file to persist changes

### File Structure

```
GroupMe App/
├── index.html              # Main swipe deck
├── app.js                  # Core app logic
├── groupme.html            # GroupMe import page
├── groupme.js              # GroupMe API integration
├── liked.html              # Liked profiles view
├── liked.js                # Liked profiles logic
├── styles.css              # Application styles
├── peopleData.json         # Profile data (auto-load source)
├── likedProfiles.json      # Fallback liked profiles
├── README.md               # This file
├── PROTOTYPE_PLAN.md       # High-level feature plan
├── ASSET_AUDIT.md          # Asset metadata
└── public/images/          # Placeholder images
```

## Features

### Main Deck (`index.html`)
- Browse profiles with smooth swipe/drag interactions
- Keyboard support: arrow keys left/right to swipe
- Desktop buttons: ✕ to dismiss, 🙏 to like
- Real-time like count in the action bar

### Liked Profiles (`liked.html`)
- View all liked profiles with images and metadata
- Export liked profiles as JSON
- Clear all likes (with confirmation)
- Navigate back to the main deck

### GroupMe Import (`groupme.html`)
- Token-based login to your GroupMe account
- Select any of your groups
- Preview member count before importing
- Two merge strategies (replace or append)
- Immediate in-app updates
- Download updated `peopleData.json` for persistence

## Data Format

Profiles are stored in `peopleData.json` as loose JSON objects (not wrapped in an array):

```json
{
  "id": "user123",
  "name": "Alice",
  "nickname": "Ali",
  "image_url": "https://example.com/alice.jpg",
  "roles": ["friend", "colleague"]
},
{
  "id": "user456",
  "name": "Bob",
  "nickname": "B",
  "image_url": "https://example.com/bob.jpg",
  "roles": []
}
```

When importing from GroupMe, members are automatically normalized to this format.

## Troubleshooting

### CORS Error When Fetching Groups
**Issue:** "Failed to fetch groups" error when clicking "Fetch Groups"

**Solution:** Make sure you're serving the app over HTTP (not `file://`). Run a local server as described in "Getting Started."

### Invalid Token Error
**Issue:** "Invalid token. Check your GroupMe access token." message

**Solution:** 
- Visit [dev.groupme.com/applications](https://dev.groupme.com/applications)
- Verify you've copied the correct token
- Make sure the token hasn't been revoked
- Try generating a new token if needed

### No Groups Found
**Issue:** "No groups found" even though you're in GroupMe groups

**Solution:**
- The token must belong to a GroupMe account
- You must be a member of at least one group
- Try logging out and back into GroupMe, then generating a fresh token

## Data Storage

The app uses **browser localStorage** to persist profile data:

- **First load:** App checks browser storage; if empty, loads from `peopleData.json`
- **After import:** Profiles are automatically saved to browser storage
- **Persistent:** Profiles remain in the browser until explicitly cleared or browser data is deleted
- **No server needed:** All data stays on your device

### Clear Browser Storage

To reset to the original `peopleData.json`:
```javascript
// Open browser console (F12) and run:
window.clearProfilesStorage();
// Then refresh the page
```

Or manually via browser DevTools:
1. Open DevTools (F12)
2. Go to "Storage" or "Application" tab
3. Find "Local Storage" → your domain
4. Delete the `profilesData` key
5. Refresh the page

### Download Backup

You can download your current profile data:
1. Go to the GroupMe import page
2. After any import, the download link provides your current profile list
3. Save this for backup or sharing

## Development

### Adding New Pages
1. Create an `*.html` file in the project root
2. Link it in the navigation headers (see `app.js`, `liked.html`, `groupme.html`)
3. Import `styles.css` for consistent styling
4. Reuse helper functions exported to `window` if needed

### Browser Storage Helper Functions

Export to `window` for cross-page use:
- `window.saveProfilesToStorage(profiles)` - Save profiles array to localStorage
- `window.clearProfilesStorage()` - Delete stored profiles (return to default)
- `window.PROFILES_STORAGE_KEY` - Storage key name (`"profilesData"`)

### Exporting Helpers
Common functions are exported to the global scope for reuse across pages:
- `window.parseLooseJson()` - Parse loose JSON format
- `window.normalizeProfiles()` - Normalize profile objects
- `window.resetDeck()` - Reset the main deck (optionally with new profiles)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 15+
- Mobile browsers (tested on iOS Safari, Chrome Mobile)

## License

MIT (adjust as needed)

## Contributing

Feedback and improvements welcome! Please test the following:
- Import with different group sizes (small and large)
- Switching between replace and append strategies
- Multiple imports from different groups
- Cross-tab updates (open main deck in two tabs, import in one)
