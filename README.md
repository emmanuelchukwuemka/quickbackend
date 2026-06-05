# quick-backend

Backend API prepared for deployment on Render.

## Render deployment setup

1. Connect this GitHub repo to Render.
2. Use `render.yaml` as the service configuration.
3. Set required environment variables in Render dashboard or via `render.yaml`:
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
- `.env` is ignored in git and should be managed through Render secrets.
- Local development is still available via `npm run dev`.
