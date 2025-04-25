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
    - [ ] Schema: Add/verify `isPublic: Boolean` on `Collection`.
    - [ ] Backend: Update `GET` endpoints for collections to check `isPublic` and ownership for private collections (return 403 if needed).
    - [ ] Backend: Update `PATCH /api/collections/:collectionSlug` to allow changing `isPublic`.
    - [ ] Frontend: Handle 403 errors gracefully on collection page.
    - [ ] Frontend: Add public/private toggle to collection edit UI.
4.  **User Profile Page (`/username`)**
    - [ ] Concept: Define as a special public collection (e.g., slug `profile`).
    - [ ] Seed Data: Ensure users have a default "profile" collection.
    - [ ] Backend: Ensure public collection endpoints can serve this page.
    - [ ] Frontend: Create `/[userSlug]/page.tsx` component.
    - [ ] Frontend: Fetch and display profile collection data.

## Phase 3: User Interaction

5.  **Collection Likes (MVP)**
    - [ ] Schema: Create `CollectionLike` model (User <-> Collection).
    - [ ] Backend: `POST /api/collections/:collectionSlug/like` endpoint (Create Like).
    - [ ] Backend: `DELETE /api/collections/:collectionSlug/like` endpoint (Delete Like).
    - [ ] Backend: Update collection GET endpoints to include like count and `currentUserHasLiked`.
    - [ ] Frontend: Display Like button and count on collection pages.
    - [ ] Frontend: Implement Like/Unlike logic for logged-in users (call API, optimistic update, SWR mutate).
    - [ ] Frontend: Implement login/register prompt for non-logged-in users clicking Like.

## Future Considerations (Post-MVP)

- Shortened/Obfuscated Share Links (e.g., `/c/:shortId`).
- More complex interactions (e.g., comments).
- Advanced collection editing/management.
- Improved UI/UX for various flows.

## Pending Issues

- Fix authentication forwarding for `GET /api/channels` called from the frontend route handler. (Needed for Command Palette subscriptions).
