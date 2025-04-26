# WatchLikeMe MVP Feature Roadmap

This roadmap outlines the next phases of development, focusing on delivering core MVP features in manageable, committable steps.

## Phase 1: Foundational Enhancements

1.  **Collection Notes/Documentation (MVP)**
    - [ ] Backend: `PATCH /api/collections/:collectionSlug` to update `description`.
    - [ ] Frontend: Display description on collection page.
    - [ ] Frontend: Add simple "Edit Description" UI for owner.
2.  **Account Management: Google Unlink/Relink**
    - [ ] Backend: `DELETE /api/users/me/google-tokens` endpoint.
    - [ ] Backend: Verify re-linking flow via `/api/auth/google`.
    - [ ] Frontend: Basic `/account` page UI.
    - [ ] Frontend: Implement "Unlink" button and API call.
    - [ ] Frontend: Implement "Link/Relink" button.

## Phase 2: Core Sharing & Public Viewing

3.  **Public/Private Collections & Access Control**
    - [x] Schema: Add/verify `isPublic: Boolean` on `Collection`.
    - [x] Backend: Update `GET` endpoints for collections to check `isPublic` and ownership for private collections.
    - [x] Backend: Update `PUT /api/collections/:collectionSlug` to allow changing `isPublic`.
    - [ ] Frontend: Handle 403 errors gracefully on collection page.
    - [ ] Frontend: Add public/private toggle to collection edit UI.
4.  **User Profile Page (`/username`) - DEFERRED**
    - [ ] Concept: Define as a special public collection (e.g., slug `profile`).
    - [ ] Seed Data: Ensure users have a default "profile" collection.
    - [ ] Backend: Ensure public collection endpoints can serve this page.
    - [ ] Frontend: Create `/[userSlug]/page.tsx` component.
    - [ ] Frontend: Fetch and display profile collection data.

## Phase 3: User Interaction

5.  **Collection Likes (MVP)**
    - [x] Schema: Create `CollectionLike` model (User <-> Collection).
    - [x] Backend: `POST /api/collections/:collectionSlug/like` endpoint (Create Like).
    - [x] Backend: `DELETE /api/collections/:collectionSlug/like` endpoint (Delete Like).
    - [x] Backend: Update collection GET endpoints to include like count and `currentUserHasLiked`.
    - [x] Frontend: Display Like button and count on specific collection page.
    - [x] Frontend: Implement Like/Unlike logic for logged-in users on specific collection page.
    - [ ] Frontend: Implement login/register prompt for non-logged-in users clicking Like.
    - [ ] Frontend: Add Like button display/logic to User Profile page.

## Future Considerations (Post-MVP)

- Shortened/Obfuscated Share Links (e.g., `/c/:shortId`).
- More complex interactions (e.g., comments).
- Advanced collection editing/management.
- Improved UI/UX for various flows.

## Pending Issues

- **Hybrid User Google Sign-In:** Existing users with both password and Google ID are incorrectly redirected to /register instead of being logged in or prompted for password when using "Sign in with Google". Passport strategy needs further investigation.
- **Public User Profile Routing:** The route `GET /api/users/:userSlug/collections/profile` is not resolving correctly (404). Needs investigation into Express routing/mounting.
- **`/api/channels` Auth Forwarding:** Frontend route `/api/channels` fails its _initial_ call to the backend equivalent due to auth issues, though it recovers via fallback.
- **(Minor) Type Error:** Persistent type error on `app.use(passport.initialize())` in `backend/src/index.ts`.
