# Student KYC API

The KYC API stores profile metadata in MongoDB and private assets in an authenticated Cloudinary folder. It uses HttpOnly JWT cookies; student accounts can only read their own profile and files, while administrator accounts are seeded from server environment variables.

## Configuration

Copy `.env.example` to `.env` and set `MONGO_URI`, a random `JWT_SECRET` with at least 32 characters, and the Cloudinary credentials. Set `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 16 characters to create the initial administrator. The backend loads this `.env` relative to its own directory, regardless of the directory used to launch it. The admin account is created if it does not exist; its password is not silently reset on subsequent starts.

Set `FRONTEND_ORIGINS` to the exact comma-separated frontend origins allowed to make credentialed requests. In the frontend, set `NEXT_PUBLIC_KYC_API_URL` to the API origin (for local development, `http://localhost:5000`).

Run `npm install`, `npm run dev`, and `npm test` from this directory. The first admin must be provisioned before administrator sign-in is available.

## API

- `POST /api/auth/register`, `POST /api/auth/student/login`, `POST /api/auth/admin/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/kyc/me`, `POST /api/kyc`, `PUT /api/kyc/me`, `POST /api/kyc/submit`
- `POST /api/kyc/documents/upload`, `DELETE /api/kyc/documents/:documentId`, `GET /api/kyc/documents/:documentId/download`
- `GET /api/kyc/generated-documents`
- `GET /api/admin/kyc`, `GET /api/admin/kyc/:kycId`
- `PATCH /api/admin/kyc/:kycId/status`, `PATCH /api/admin/kyc/:kycId/documents/:documentId/review`
- `POST /api/admin/kyc/:kycId/request-correction`, `POST /api/admin/kyc/:kycId/verify`, `POST /api/admin/kyc/:kycId/notes`
- `GET|POST|PUT /api/admin/kyc/citizenship-template`, `POST /api/admin/kyc/citizenship-template/font`
- `POST /api/admin/kyc/:kycId/generate-citizenship-draft`

Documents are proxied through authenticated API endpoints and are never served from public storage URLs. A generated citizenship PDF is watermarked as an internal sample and is not an official certificate.
