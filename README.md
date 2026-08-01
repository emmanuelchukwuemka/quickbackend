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

## Build & start commands

- Build: `npm run build`
- Start: `npm start`

## Notes

- The project uses `dist/` for compiled TypeScript output.
- `.env` is ignored in git and must never be committed — manage secrets on the server directly.
- Local development is still available via `npm run dev`.
