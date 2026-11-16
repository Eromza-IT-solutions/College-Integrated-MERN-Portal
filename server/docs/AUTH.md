# Authentication and RBAC: how it works

Cookie sessions (`express-session` + `connect-mongo`), bcrypt passwords, database-driven role permissions.
No JWT. The browser only holds an HttpOnly session cookie; the role is always read from the database.

## 1. First-time setup

```bash
cd server
cp .env.example .env          # then fill in the values below (never commit .env)
npm install
npm run seed:permissions      # loads the 178 permission rules (insert-only, safe to re-run, see section 7)
npm run create-super-admin    # asks for name, email, password (hidden). Only works once.
npm run dev
```

Required settings in `.env`:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Database |
| `CLIENT_ORIGIN` | Exact URL of the frontend (CORS and the CSRF Origin check) |
| `SESSION_SECRET` | Long random string; signs the session cookie |
| `LOGIN_ID_HASH_SECRET` | Existing; used for stored login-id lookups. Do not change once users exist |
| `RATE_LIMIT_HASH_SECRET` | 32+ random characters; **required in production**. Keys the rate-limit fingerprints |
| `SMTP_HOST/PORT/SECURE/USER/PASS`, `EMAIL_FROM` | Real password-reset emails. Without them, development prints the email in the console |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
Tunable (optional): `SESSION_MAX_AGE_MS` (idle timeout, default 30 min), `LOGIN_LOCKOUT_THRESHOLD` (5), `LOGIN_LOCKOUT_MS` (15 min), `RATE_LIMIT_*`.
In production also set `NODE_ENV=production` (secure cookie, trusted proxy) and serve over HTTPS.

## 2. API contract (all under `/api/v1`)

Every response: `{ "success": true, "data": {...}, "meta": { "requestId": "..." } }`
Errors: `{ "success": false, "error": { "code": "...", "message": "...", "errors": [...] }, "meta": {...} }`
Send requests with credentials (`withCredentials: true`); the cookie does the rest.

| Endpoint | Body | Success | Errors |
|---|---|---|---|
| `POST /auth/login` | `{ identifier, password }` (email, mobile or Aadhaar) | 200 `{ user, permissions }` + session cookie | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_NOT_ACTIVE` / `ACCOUNT_NOT_CONFIGURED`, 429 `LOGIN_LOCKED` (+ `Retry-After`) |
| `GET /auth/me` | none | 200 `{ user, permissions }` | 401 `UNAUTHENTICATED` |
| `POST /auth/logout` | none | 200 `{ loggedOut: true }` (safe to repeat) | none |
| `POST /auth/forgot-password` | `{ email }` | 200 always the same message | 400, 429 |
| `POST /auth/reset-password` | `{ token, password }` | 200 | 400 `WEAK_PASSWORD`, 400 `INVALID_OR_EXPIRED_TOKEN`, 429 |

`user` = `{ id, fullName, email, role, departmentId, mustChangePassword }`.
`permissions` = list of `{ resource, action, scope }` for the user's role (use it to show or hide menu items; the server still enforces everything).
Other codes: `FORBIDDEN` (403, no permission or record out of reach), `NOT_FOUND`, `CSRF_BLOCKED` (403).

Super Admin only: `GET /roles`, `GET /roles/:roleKey`, `GET /permissions`, `GET /permissions/catalog`,
`POST /permissions`, `PUT /permissions/:id` (scope only), `DELETE /permissions/:id`. Roles cannot be created or deleted.

### Frontend swap (not applied; the frontend was left untouched)

`client/src/services/authService.js` currently accepts any password for demo accounts. To use the real API, replace
`loginWithDemoAccount` with:

```js
import http from "./http";            // already has withCredentials: true
export async function login({ identifier, password }) {
  const { data } = await http.post("/auth/login", { identifier, password });
  return data.data.user;              // { id, fullName, email, role, ... }
}
export async function fetchCurrentUser() { return (await http.get("/auth/me")).data.data.user; }
export async function logout() { await http.post("/auth/logout"); }
```
Then call `fetchCurrentUser()` once when the app loads (so a refresh keeps you signed in), call `logout()` from the sidebar and
profile menu, and treat any 401 as "go to /login". The frontend uses `name`; the API returns `fullName`.
Passwords are never stored in the browser.

## 3. How a request is checked

```
authenticate -> authorizeRole (optional) -> requirePermission(resource, action) -> record guard -> handler
 who are you?     right kind of person?      does the role have this rule?       is THIS record in reach?
 401              403                        403                                 404 / 403
```
Record guards: `checkRecordScope`, `checkDepartmentAccess`, `checkResourceOwnership` (see `src/middleware/authorize.js`).
Every new feature route must chain `authenticate` and `requirePermission`; a record route must also use a guard.

## 4. Security features

- bcrypt (cost 12); password policy: 12-128 chars, varied, no banned words.
- Generic login error and equalised timing: no way to tell if an account exists.
- Session id regenerated at login (fixation); cookie HttpOnly, SameSite=Lax, Secure in production; 30-minute idle timeout.
- Sessions end when the account is disabled, its role is removed, or its password changes.
- Lockout: 5 failed attempts locks the account 15 minutes (also for unknown identifiers, so locking reveals nothing). IP limits on login, forgot and reset.
- Reset tokens: random, only a SHA-256 hash is stored, one-time, 30-minute expiry. The forgot-password answer is identical for unknown emails.
- Rate-limit counters store HMAC fingerprints, never raw email, mobile or Aadhaar.
- CSRF: SameSite cookie plus an Origin check on POST/PUT/PATCH/DELETE (`src/middleware/originCheck.js`).
- Audit log for logins, failures, lockouts, resets, logouts, denied access and permission changes (never passwords, tokens or identifiers).

## 5. Roles

`superAdmin`, `websiteAdmin`, `admissionAdmin`, `examAdmin`, `hod`, `teacher`, `student`, `applicant`. Fixed. Scopes: `own`, `department`, `all`.
The rules live in `scripts/data/permission-matrix.json`.

## 6. Tests

`npm test` (17+ suites, uses an in-memory MongoDB, never your real database) and `npm run lint`.

## 7. Known limits and to-do

- `npm run seed:permissions` is insert-only: it adds missing rules and never changes existing ones, so scopes edited through the API survive. A rule revoked through the API is restored by the next run. `-- --prune` deletes every rule not in the matrix (including ones added through the API). A scope change inside the matrix file does not reach existing databases.
- The matrix has no resources yet for fee configuration, hall tickets, courses/faculty profiles or global settings; add rows and seed to enable them.
- Teacher "assigned subject/class" limits must be checked inside each feature module.
- The permission cache is per server instance (60 s); a change made on one instance can take up to 60 s on others.
- Not built: user management screens, changing a password while signed in, email verification, two-factor login.
