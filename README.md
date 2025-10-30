# CodeHive Frontend

CodeHive is a React + Vite application that implements the authentication flow for the CodeHive MVP. The current build provides:

- Firebase-powered email/password authentication restricted to `@depauw.edu` addresses
- Dedicated sign-up and sign-in pages with validation and helpful error messages
- A protected application shell with a global navigation bar and placeholder screens for Profiles, TA Calendar, Roadmaps, Forum, and Account settings

## 1. Configure Firebase

Create a Firebase project and enable **Email/Password** authentication. Copy the config values and add them to a `.env` file in the project root:

```bash
# .env
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
```

> Keep this file out of version control; the generated `.gitignore` already ignores `.env`.

## 2. Install dependencies

```bash
npm install
```

## 3. Run the app locally

```bash
npm run dev
```

Visit the printed local URL (typically http://localhost:5173). Try signing up with a valid DePauw address (e.g. `student@depauw.edu`), then log in to access the protected home screen and navigation.

## Project structure

```
src/
  components/         reusable UI pieces (navbar, layout, route guard)
  context/            AuthProvider that wires Firebase auth state
  hooks/              custom React hooks (e.g. useAuth)
  pages/              routed pages (Auth screens + protected areas)
  firebase.js         Firebase app/bootstrap logic
```

## Next steps

- Hook the placeholder pages (Profiles, TA Calendar, etc.) to real data sources
- Expand the auth flow with email verification, password resets, and role assignment
- Add automated tests (unit/integration) for auth flows and route guards
- Harden the UI/UX with toasts, loading indicators, and accessibility refinements
