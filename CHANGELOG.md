# Changelog

All notable changes to this project will be documented in this file.

## [1.1.5] - 2026-07-24
---
### Fixed
- Fixed forgot-password (and login/register) reporting "user not found" for emails saved with different casing than stored, by normalizing email lookups in `users.repository.ts`.
- Fixed `Result.value(null)` throwing instead of representing a valid "not found" result, which was masking real 404s as 500s across every repository.

------
## [1.1.4] - 2026-07-18
---
### Added
- Added `POST /api/uploads` endpoint — uploads a single image/PDF (≤5MB) and returns its hosted URL, for use ahead of registration and profile update calls.
- Added `profile` (user role) field to the login success response.
- Added `logoUrl` to startup profile, `avatarUrl` to investor profile, and `imageUrl` to each `coreLeadership` team member.
- Added expanded response fields (`logoUrl`, `pitchVideoUrl`, `proof`, `coreLeadership`, `biography`, `visionAndMission`, `contactInformation`, `picture`) to the startup match-score / feed-details endpoint.
- Added `src/helpers/httpStatus.utils.ts` with named HTTP status constants.
- Added `src/services/email.service.ts` wrapping Nodemailer over Brevo SMTP (`sendOtpEmail`, `sendPasswordResetEmail`), and wired real email delivery into registration, login, resend-otp, and forgot-password flows.
- Added `engines` field to `package.json` for Render deployment.

### Changed
- Changed registration (`/auth/register/business-owner`, `/auth/register/investor`) and startup profile update (`/profile/startup`) from `multipart/form-data` to JSON bodies — file uploads now go through `POST /api/uploads` first and are passed as URLs (`identificationDocumentUrl`, `proof.*`, `logoUrl`, `coreLeadership[].imageUrl`).
- Changed `coreLeadership` on profile update from a JSON-stringified form field to a plain JSON array.
- Changed every `res.status(<number>)` call across controllers and middleware to use the new `httpStatus` constants.
- Changed the OTP debug field on auth responses to be included only outside production.
- Changed startup profile `proof` updates to merge with existing values instead of overwriting the whole sub-document.
- Changed OTP/password-reset email copy from a raw ISO timestamp to a relative "expires in N minutes" message.

### Fixed
- Fixed `handleUploadError` middleware being fully implemented but never wired into any route — unsupported file types and oversized files now return a clean JSON error instead of a raw server error.
- Fixed partial `proof` updates silently wiping previously-set document links.

------
## [1.1.3] - 2026-06-19
---
### Added
- Added `currency` support to startup profile updates and discovery responses.
- Added `pitchVideoUrl` as a startup profile field and scalability signal.
- Added support for richer proof uploads on startup profile update: `pitchDeckFile`, `businessPlanFile`, and `financialModelFile`.
- Added `coreLeadership` update support (including JSON-string parsing for multipart/form-data payloads).

### Changed
- Changed startup `marketSize` and `totalAddressableMarket` types from string to number in model/schema and profile validation.
- Changed scalability risk scoring to a normalized 0-100 calculation based on total possible points (instead of hard capping with `Math.min`).
- Changed proof scoring keys to align with model fields: `cac`, `pitchDeck`, `businessPlan`, and `financialModel`.
- Changed discovery feed and startup match payloads to include monetary context fields (`marketSize`, `totalAddressableMarket`, and `currency`).
- Changed startup profile route upload field mapping to match expanded proof document support.

### Fixed
- Fixed startup profile proof mapping mismatch by replacing legacy financial statement handling with `financialModel`.
- Fixed startup update error transparency by returning repository error details in controller responses.

------
## [1.1.2] - 2026-06-16
---
### Added
- Added discovery feature endpoints and controller flow for investor startup feed and match scoring.
- Added profile endpoints and controller flow for fetching and updating startup/investor profiles.
- Added shared upload middleware usage for auth and profile file uploads.
- Added Joi-based request validation coverage for discovery and profile request fields.

### Changed
- Updated signup logic for business owner and investor to:
	- hash passwords before persisting users.
	- use a single email lookup flow and branch by verified vs unverified account state.
	- regenerate OTP for existing unverified users instead of hard-failing as duplicate.
- Updated OTP persistence from in-memory storage to MongoDB-backed repository behavior.
- Updated signup OTP save flow to write directly with saveOtp (upsert) instead of pre-checking for existing OTP records.
- Updated profile routes to enforce authentication middleware globally.
- Updated auth upload route imports to use the shared upload middleware module.
- Updated authenticate middleware to return a controlled 401 response for invalid/expired JWT verification errors.

### Fixed
- Fixed crash caused by `req.auth` being undefined on profile update endpoints by applying auth middleware to profile routes.
- Fixed signup/investor OTP not being persisted reliably by switching OTP repository logic to MongoDB operations.
- Fixed duplicate upload middleware definitions by centralizing upload behavior in the upload middleware module.
- Fixed inconsistent OTP file validation behavior by allowing image/PDF uploads via the shared middleware.


------
## [1.1.1] - 2026-02-01
---
### Added
- Added package.json with necessary dependencies and scripts for development and production.
- Created app.ts for Express application setup with middleware and sample route.
- Implemented config.ts for environment variable management and application configuration.
- Established database connection in db.ts using Mongoose.
- Developed auth.controllers.ts for user authentication (initial structure).
- Added response utilities in response.utils.ts for standardized API responses.
- Introduced result.helpers.ts for handling operation results with error management.
- Created validation.helper.ts for data validation using Joi.
- Set up main entry point in index.ts to start the server and handle errors.
- Configured TypeScript settings in tsconfig.json for project compilation.

### Changed
- _None_

### Fixed
- _None_

<!-- ------ -->