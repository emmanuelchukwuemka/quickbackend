# quick-backend

Backend API for QuickDrop, deployed on cPanel (Node.js via Phusion Passenger) at www.quickdrop.ng.

## Required environment variables

Set these in the server's `.env` (see cPanel Node.js app config):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `MAIL_HOST`
   - `MAIL_PORT`
   - `MAIL_USERNAME`
   - `MAIL_PASSWORD`
   - `MAIL_FROM_ADDRESS`
   - `MAIL_FROM_NAME`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — seeds the first (and only automatically-created) `/admin` login on first startup. See "Admin panel" below.

## Admin panel

The React admin dashboard (`admin/`) is served at `/admin` from this same server —
see `admin/README` equivalent notes in `src/app.ts`. There's no self-service
signup: the very first admin account is created automatically at server
startup from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`, but only while the
`admin_users` table is empty — set once, then safe to leave in `.env`
indefinitely. Every login after that goes through the normal password (now
possibly changed via the panel's Settings page). Additional admins are
created from inside the panel (Users & Roles, super_admin only), not via any
public endpoint.

## Build & start commands

- Build: `npm run build`
- Start: `npm start`

## Notes

- The project uses `dist/` for compiled TypeScript output.
- `.env` is ignored in git and must never be committed — manage secrets on the server directly.
- Local development is still available via `npm run dev`.
