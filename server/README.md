# ShopShield Backend

The backend exposes website scanning, community report submission, and
authenticated report moderation APIs. It uses MongoDB for community reports
and optionally uses Google Safe Browsing, VirusTotal, and RDAP for reputation
and domain-age checks.

## Setup

Use Node.js and npm from this `server` directory:

```powershell
npm install
npm test
npm start
```

The server loads `.env` from the process working directory. MongoDB must be
available before the HTTP server starts.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `ADMIN_SECRET` | Yes for admin routes | Secret sent in the `x-admin-key` header |
| `GOOGLE_SAFE_BROWSING_API_KEY` | No | Google Safe Browsing API key |
| `VIRUSTOTAL_API_KEY` | No | VirusTotal API key |
| `PORT` | No | HTTP port; defaults to `5000` |
| `CORS_ORIGINS` | No | Comma-separated browser origins; defaults to `http://localhost:5173` |

Keep `.env` out of source control. The server `.gitignore` excludes it.
If a reputation API key is missing or the provider is unavailable, that
provider is reported unavailable; it is not treated as a clean result.

## API

All responses use JSON. Request bodies are limited to 10 KB. URLs are limited
to 2,048 characters and must use HTTP or HTTPS.

### `GET /api/health`

Returns `200` when the HTTP application is running:

```json
{
  "success": true,
  "message": "ShopShield API is running"
}
```

This endpoint does not test the MongoDB or third-party API connections.

### `POST /api/scan`

Rate limited to 20 requests per IP in 15 minutes.

Request:

```json
{
  "url": "https://shop.example/product"
}
```

Successful response (`200`):

```json
{
  "success": true,
  "message": "Website analysis completed successfully.",
  "requestedUrl": "https://shop.example/product",
  "finalUrl": "https://shop.example/product",
  "scan": {
    "success": true,
    "website": {
      "url": "https://shop.example/product",
      "domain": "shop.example"
    },
    "riskScore": 0,
    "riskLevel": "Low Risk",
    "confidence": 100,
    "completedFactors": 6,
    "totalFactors": 6,
    "analysisStatus": "complete",
    "factors": {
      "urlSecurity": {
        "name": "URL Security",
        "points": 0,
        "maximumPoints": 83,
        "weight": 15,
        "weightedContribution": 0,
        "status": "completed",
        "reasons": [],
        "evidence": {}
      },
      "domainAge": {
        "name": "Domain Age",
        "points": 0,
        "maximumPoints": 25,
        "weight": 15,
        "weightedContribution": 0,
        "status": "completed",
        "reasons": [],
        "evidence": {}
      },
      "reputation": {
        "name": "Website Reputation",
        "points": 0,
        "maximumPoints": 40,
        "weight": 25,
        "weightedContribution": 0,
        "status": "completed",
        "reasons": [],
        "evidence": {}
      },
      "priceAnalysis": {
        "name": "Price Analysis",
        "points": 0,
        "maximumPoints": 25,
        "weight": 15,
        "weightedContribution": 0,
        "status": "completed",
        "reasons": [],
        "evidence": {}
      },
      "contentAnalysis": {
        "name": "Website Content",
        "points": 0,
        "maximumPoints": 44,
        "weight": 15,
        "weightedContribution": 0,
        "status": "completed",
        "reasons": [],
        "evidence": {}
      },
      "communityReports": {
        "name": "Community Reports",
        "points": 0,
        "maximumPoints": 20,
        "weight": 15,
        "weightedContribution": 0,
        "status": "completed",
        "reasons": [],
        "evidence": {}
      }
    }
  }
}
```

`factors` contains all six keys: `urlSecurity`, `domainAge`, `reputation`,
`priceAnalysis`, `contentAnalysis`, and `communityReports`. Unavailable
factors have `status: "unavailable"` and do not increase the confidence
percentage. Confidence is the percentage of factor weight successfully
evaluated. Risk levels are `Low Risk` (0-30), `Medium Risk` (31-60), and
`High Risk` (61-100); a score cannot be calculated if all factors are
unavailable.

Content evidence includes domain-page discovery results. Discovery analyzes
up to six same-host pages (including the scanned page), prioritizes contact
and policy pages, excludes account/cart/checkout pages, and records failed
fetches without treating them as successful checks.

Common errors:

| Status | Meaning |
| --- | --- |
| `400` | Missing or invalid request field |
| `413` | Request body exceeds 10 KB |
| `422` | Target website could not be fetched safely |
| `429` | Scan rate limit exceeded |
| `503` | Analysis could not be completed |

### `POST /api/reports`

Rate limited to five submissions per IP in 15 minutes. New reports enter
moderation as `pending`.

Request:

```json
{
  "url": "https://shop.example/product",
  "reason": "Non-delivery",
  "description": "Order was not delivered after the stated delivery window."
}
```

Allowed `reason` values: `Fake payment page`, `Fake discounts`, `Phishing`,
`Product scam`, `Non-delivery`, and `Other`. `description` is optional and is
limited to 500 characters.

Successful response (`201`):

```json
{
  "success": true,
  "message": "Your report has been submitted for review.",
  "report": {
    "id": "report-id",
    "domain": "shop.example",
    "reason": "Non-delivery",
    "description": "Order was not delivered after the stated delivery window.",
    "status": "pending",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Common errors: `400` for invalid input, `409` for a similar report submitted
in the last 24 hours, `413` for an oversized body, `429` for rate limiting,
`503` when MongoDB is disconnected, and `500` for an unexpected save error.

### `GET /api/admin/reports`

Requires the `x-admin-key` header to match `ADMIN_SECRET`. Lists up to 100
reports, newest first. The optional `status` query parameter accepts
`pending` (default), `approved`, or `rejected`.

Response:

```json
{
  "success": true,
  "count": 1,
  "reports": []
}
```

Invalid status returns `400`; missing or incorrect credentials return `401`.
If `ADMIN_SECRET` is not configured, the endpoint returns `500`.

### `PATCH /api/admin/reports/:id`

Requires the same `x-admin-key` header. Only a pending report can be reviewed.

Request:

```json
{
  "status": "approved",
  "reviewNote": "Reviewed and verified."
}
```

`status` must be `approved` or `rejected`; `reviewNote` is optional and limited
to 500 characters. A successful response (`200`) includes the updated `report`.
Invalid IDs or bodies return `400`; a missing or previously reviewed pending
report returns `404`.

## Security behavior

- Website fetching rejects local/private/reserved IP destinations, credentials,
  unsupported protocols, and nonstandard ports.
- DNS results are checked and the connection is pinned to a validated address.
- Redirect destinations are revalidated; at most five redirects are followed.
- Domain-page discovery restricts links and redirects to the exact scanned
  hostname.
- Website requests have a 10-second timeout and a 2 MB HTML limit.
- Helmet security headers, configured CORS origins, Joi validation, JSON
  request limits, and scan/report rate limits are enabled.
- Admin credentials are compared with a timing-safe equality check.

## Tests and verification

Run the complete automated suite with `npm test`. The suite covers factor
boundaries and failure states, API response/error handling, report moderation,
SSRF/redirect/DNS controls, request limits, and six-factor score composition.
Tests mock MongoDB and third-party APIs; live provider credentials and an
external MongoDB instance are needed for live-service verification.
