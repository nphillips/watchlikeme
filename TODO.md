# MVP Roadmap

### Setup and Environment

- **Repo & Monorepo Structure**

  - Define frontend/backend directories; ensure Yarn workspace setup works smoothly
  - **Done:** Frontend (`Next.js`) & backend (`Express`) launch independently without issues

- **Database & Prisma Integration**

  - Schema defined clearly (`User`, `Collection`, `Channel`, `CollectionItem`)
  - Seed realistic initial data for testing
  - **Done:** Database seeded; Prisma client queries work via Prisma Studio

- **Environment and Netlify Setup**
  - Netlify functions configured (`backend/dist`), deploy settings finalized
  - Environment variables (`.env`) finalized for local/dev/staging
  - **Done:** `netlify dev` serves frontend, proxies functions without errors

---

### Authentication and Authorization

- **Google OAuth Integration (Login w/ YouTube)**

  - Express route `/api/auth/google` and `/api/auth/google/callback` working
  - JWT token generation & secure middleware implemented
  - **Done:** Users can log in/out via Google; protected routes properly secured with JWT

- **Authorization Middleware**
  - Check JWT tokens, ensure user session data available to routes
  - **Done:** Auth-protected routes return `401/403` correctly if unauthorized

---

### YouTube API Integration

- **Fetch User's Subscribed Channels**

  - Backend fetches subscribed channels & videos using YouTube API
  - Cache responses to avoid API rate limits
  - **Done:** Channels/videos reliably fetched & cached (verified locally)

- **YouTube API Likes Integration**
  - Fetch and display user's liked videos
  - **Done:** User's liked videos marked visually in the frontend

---

### Collections Management

- **Create, View, Edit, Delete Collections**

  - Backend CRUD routes complete (`POST`, `GET`, `PATCH`, `DELETE`)
  - Prisma ORM queries tested thoroughly
  - **Done:** CRUD works end-to-end; validated via frontend and Postman

- **Select Channels/Videos into Collections (Frontend)**
  - Side-modal selection UI working seamlessly
  - User selections persist through searches (maintained state)
  - **Done:** Selected items clearly visible, removable; persists during collection building

---

### Frontend Next.js UI Implementation

- **Page Structure Setup**

  - Home page (`/`), account page (`/account`), collections (`/collections`), public collections (`/[userSlug]/[collectionSlug]`)
  - **Done:** Each page route clearly mapped and reachable without errors

- **Channel/Video Display UI (shadcn + Tailwind)**

  - Visually appealing, responsive channel/video display components complete
  - Expand/collapse and horizontal scrolling implemented
  - **Done:** Consistent UI components, responsive on desktop & mobile

- **Collection Viewing UI**
  - Collection items display properly, sortable/filterable by latest
  - **Done:** Public collections viewable; item lists load quickly

---

### Sharing & Public Visibility

- **Public Collections URLs**

  - Automatic slug generation (`my favorites` → `my-favorites`)
  - **Done:** Collections publicly accessible at predictable URL (`watchlikeme.com/username/slug`)

- **Public Collection Viewing**
  - Allow not-logged-in users to view public collections, videos, and channels
  - **Done:** No login required for read-only viewing; tested in incognito

---

### Annotations / Documentation

- **Collection-level Notes**
  - Allow adding/editing notes (annotations) at collection level
  - **Done:** Notes editable by collection creator; persist correctly, displayed publicly

---

### User Profile & Settings

- **User Profile Management**
  - Basic profile editing (username, optional profile image upload)
  - **Done:** Users can update/save profile info; displayed correctly in public URLs

---

### Admin & Cleanup Tasks

- **Admin Dashboard (minimal, one admin only)**

  - Ability to view all users and basic user data
  - **Done:** Simple admin UI/API endpoint available for manual inspection

- **Code Quality & Linting**

  - Prettier/ESLint setup completed; scripts configured
  - **Done:** All code passes linting without warnings/errors

- **Error Handling & Loading States**
  - Graceful API loading & error indicators on frontend
  - **Done:** Loading states and errors clearly visible and tested with edge cases

---

### Deployment

- **Deploy via Netlify**
  - Production deployment workflow fully tested and documented
  - **Done:** App deployed live at Netlify with production settings; environment variables verified

---

### Testing & Validation

- **End-to-End User Flows**
  - Manual QA tests of key user flows documented clearly
  - **Done:** Critical paths (login, create/share/view collections) pass manual QA testing without issues

---

### Documentation

- **Project README & Setup Documentation**
  - Clear README includes instructions for setup, running locally, seeding DB, deploying
  - **Done:** Team member or mentor able to follow documentation to run the project independently

---

This roadmap covers all essential aspects, structured to be manageable as distinct Jira-style tickets.
