# WatchLikeMe

**WatchLikeMe** is a full-stack application for curating and sharing your favorite YouTube content.

Built with [Next.js](https://nextjs.org/), [Express](https://expressjs.com/), [Prisma](https://www.prisma.io/), and [PostgreSQL](https://www.postgresql.org/), the app lets users selectively showcase their YouTube subscriptions, recently watched videos, and playlists via public profile pages.

This was built as my capstone project for Fullstack Academy’s Software Engineering program. I handled the design, full-stack architecture, and implementation end to end.

### 🚀 Features

- Google OAuth login (via YouTube)
- Public user profiles (e.g. `watchlikeme.com/john-doe`)
- Curated collections for different audiences (e.g. “Stuff I send my dad”)
- Tiptap-powered rich text annotations
- Server-side rendering (Next.js) with fully custom backend
- Token-based authentication with JWT
- Built-in YouTube data fetching and sync

### 🛠 Tech Stack

- **Frontend**: Next.js, Tailwind CSS, Shadcn UI, Tiptap
- **Backend**: Express, PostgreSQL, Prisma, Zod
- **Auth**: Google OAuth + JWT
- **Deployment**: Netlify + custom server API

---

# MVP Requirements (April 2025)

## Core Value Proposition

WatchLikeMe lets logged-in users curate named collections of their subscribed YouTube channels and videos, attach personalized notes, and share collections publicly with easy-to-remember URLs.

---

## User Roles & Capabilities

### Authenticated User (Google + YouTube login required)

- Browse own YouTube subscriptions and liked videos.
- Create, edit, and delete named public collections.
- Select channels and/or individual videos from subscriptions.
- Write and edit a single collection-level Markdown note.
- Publish collections with custom URL slugs (`/username/my-favorites`).
- View collections created by any user publicly.

### Public Viewer (no login)

- Access publicly shared collections.
- Read collection notes provided by the creator.
- Browse and expand channels within collections to view videos.
- See visual indicators for videos "liked" by the creator.

_(No commenting, ratings, or anonymous sharing in MVP.)_

---

## URL Structure

| Entity               | URL Pattern                      |
| -------------------- | -------------------------------- |
| Main User Collection | `/[user-slug]`                   |
| Named Collections    | `/[user-slug]/[collection-slug]` |

**Slug Generation:**

- Auto-generated from collection name (`My Favorites → my-favorites`).
- Editable by the user before saving.
- Slug uniqueness enforced per user.

---

## Key Pages & Routes

| Page / Component       | Route                     | Description                                                          |
| ---------------------- | ------------------------- | -------------------------------------------------------------------- |
| Home / Dashboard       | `/`                       | User's subscriptions, existing collections, "New Collection" button. |
| Collections List       | `/collections`            | List and manage user's own collections.                              |
| New Collection (Modal) | Modal overlay             | Create collection: name, select items, write note, save.             |
| Edit Collection        | `/collections/:slug/edit` | Edit existing collections.                                           |
| Public Collection      | `/[user-slug]/[slug]`     | View shared collection publicly.                                     |

---

## User Interface & Flows

### Creating a New Collection (Modal Flow):

1. Click **"New Collection"** button; side-modal appears.
2. Enter **collection name** (slug auto-generated, editable).
3. **Search/filter** own YouTube subscriptions by channel name.
   - Expand channels to view individual videos (horizontal scroll).
4. **Select items**:
   - Checkboxes for channels and/or videos.
   - Channel selection overrides individual videos previously selected within the same channel.
5. Preview selected items in footer ("shopping cart") with publish dates (newest first).
6. Write a single **Markdown note** explaining your collection.
7. **Save Collection**:
   - Redirects to public collection view (`/username/slug`).
   - "Cancel" discards all progress (no drafts saved in MVP).

### Public Collection View:

- Displays collection name, creator info, and markdown-rendered note.
- Channels listed newest first; expandable to show videos.
- Videos visually indicate if creator previously "liked" them on YouTube.
- Videos embedded via YouTube iframe.

---

## Functional Requirements

- **Authentication**: Google OAuth only; JWT stored securely in HTTP-only cookies.
- **YouTube API Integration**: Retrieve user's subscriptions and "liked" videos.
- **Search**: Client-side filtering of subscriptions by channel name.
- **Item Ordering**: Channels/videos shown by newest publish date first.
- **Markdown Notes**: Simple textarea with live preview via `react-markdown` (GitHub-flavored markdown supported).
- **Public Access**: Collections publicly viewable, editing restricted to creator only.
- **SEO**: SSR pages with metadata (`<title>`, `<meta description>`, OpenGraph).
- **Security**: CORS restrictions, JWT auth, input validation via Zod.

---

## Technology Stack

| Layer              | Chosen Tech                       |
| ------------------ | --------------------------------- |
| Hosting            | Netlify + `@netlify/next` adapter |
| Frontend Framework | Next.js (React)                   |
| Styling            | Tailwind CSS, shadcn/ui           |
| Database           | PostgreSQL                        |
| ORM                | Prisma                            |
| Backend / API      | Express.js (Netlify Functions)    |
| Authentication     | JWT + Google OAuth                |
| Rich-text Editor   | Markdown (`react-markdown`)       |
| UUID Generation    | uuid package                      |
| Validation         | Zod                               |
| External APIs      | YouTube Data API v3               |
| Utilities          | slugify, date-fns                 |

---

## Non-Functional Requirements

- **Deployment**: Continuous deployments via Netlify.
- **Accessibility**: WCAG AA-compliant colors, keyboard-navigable modal.
- **Performance**: SSR public pages; target TTI ≤ 1 second.
- **Testing**: Basic smoke tests for key user flows (optional automation with Cypress/Playwright).

---

## Post-MVP Backlog (Out-of-Scope)

- Channel/video-level notes/documentation.
- Commenting/chat functionality.
- Anonymous share links.
- Ratings system and detailed activity feeds.
- Drag-and-drop reordering of items.
- Additional authentication methods.
- Email/SMS notifications.
- Global YouTube search beyond user subscriptions.

---

## Next Steps:

With these requirements defined, the next phases will include:

- Finalize **Prisma schema**.
- Define precise **REST API endpoints**.
- Create initial **UI and database scaffolding**.

---

_This MVP scope ensures a focused, achievable first release, providing foundational value and clear opportunities for future enhancements._
