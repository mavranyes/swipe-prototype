# Swipe Prototype Game Plan

1. **Organize assets**
   - Keep `peopleData.json` at the project root for now; confirm each entry has `name` and `image` (URL or local path).
   - Collect placeholder profile photos inside public/images, mirror the filename format used in the JSON, and log missing images so you can assign a shared fallback and compile a cleanup list.

2. **Scaffold a lightweight static frontend**
   - Create `index.html`, `styles.css`, and `app.js` in the root; no build tooling needed.
   - In `index.html` include the stylesheet, the script with `type="module"`, and a root `<div id="app"></div>`.

3. **Design the layout**
   - Use flexbox to center the card stack inside the viewport; set a max width (~420px) so it feels mobile-first.
   - Style a `.profile-card` with rounded corners, subtle shadow, and background image cover.
   - Overlay the name with a gradient fade at the bottom for readability.

4. **Load and prepare data**
   - In `app.js`, `fetch('./peopleData.json')`, parse JSON, and shuffle the user list for variety.
   - Map raw data to a normalized structure (id, name, imageSrc) and filter out invalid entries.

5. **Render the card stack**
   - Keep the top two profiles in the DOM to enable smooth transitions; render others lazily as needed.
   - Use template literals to inject a card element with background image and name into the root container.

6. **Implement swipe interactions**
   - Add pointer/touch handlers to the active card: track start point, translate/rotate during drag, and determine swipe once released.
   - On a decisive swipe (threshold on horizontal distance/velocity), animate the card off-screen and advance to the next profile.
   - Provide left/right buttons under the card as a desktop fallback that triggers the same advance logic.

7. **Manage state transitions**
   - Track the current index and whether an animation is running to prevent double swipes.
   - After a swipe, pre-load the next profile image to reduce flicker; when the list ends, show a simple "Out of people" message and a reset button.

8. **Polish and resilience**
   - Handle image load errors by substituting a neutral placeholder and logging the issue for later.
   - Ensure keyboard accessibility (arrow keys trigger swipes, buttons are focusable) and basic ARIA labels are present.

9. **Validate the prototype**
   - Test on desktop browsers plus mobile simulator to confirm touch works.
   - Gather quick feedback on feel/layout before introducing any backend or persistence work.

10. **Surface liked profiles**
   - Track swipe decisions in memory and persist them to local storage plus an exportable `likedProfiles.json` file.
   - Add a separate `liked.html` page that reads the stored JSON (or local storage) and lists liked users with thumbnails and metadata.
   - Provide navigation from the main deck to the liked page and offer a one-click download so testers can replace the JSON file when needed.
11. **Import profiles from GroupMe (NEW)**
   - Add a `groupme.html` page that allows users to log in via a GroupMe personal access token.
   - Users can select one of their groups and import all members as profiles into the swipe deck.
   - Supports two merge strategies:
     * **Replace**: Discard existing profiles and use only the imported group members.
     * **Append**: Merge imported members with existing profiles, skipping duplicates by user ID.
   - After import, the main deck updates immediately (if running in another tab/window); a download link generates an updated `peopleData.json` for persistent storage.
   - CORS restrictions require running a local HTTP server (e.g., `python -m http.server`) to access the GroupMe API.