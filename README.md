
# Veritas Auth Flow

This app uses Firebase for primary authentication and a Vercel-compatible OTP backend for second-factor verification.

## Local development

Use the frontend only:

```bash
npm run dev
```

Use the full stack, including the local OTP API:

```bash
npm run dev:full
```

When `OTP_DEV_MODE=true`, the OTP code is shown on the verification screen in development so you can test the entire flow without an email provider.

## Production deployment

1. Deploy the project to Vercel.
2. Add the frontend Firebase variables from `.env.example`.
3. Add the server-side variables:
	 - `FIREBASE_PROJECT_ID`
	 - `OTP_SESSION_SECRET`
	 - `RESEND_API_KEY`
	 - `OTP_FROM_EMAIL`
4. Leave `VITE_API_BASE_URL` empty if the frontend and `/api` functions are deployed in the same Vercel project.
5. Set `OTP_DEV_MODE=false` in production.

## OTP API contract

- `POST /api/auth/send-otp`
	- Requires `Authorization: Bearer <Firebase ID token>`
	- Sends or previews a 6-digit OTP
- `POST /api/auth/verify-otp`
	- Requires `Authorization: Bearer <Firebase ID token>`
	- Body: `{ "code": "123456" }`
	- Verifies the OTP challenge stored in a signed, HTTP-only cookie

