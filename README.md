# sample-badge-server

A minimal Node.js server that accepts a **POST-only** request, verifies sample credentials, and returns a generated SVG badge rendered with [`badge-maker`](https://www.npmjs.com/package/badge-maker).

## Setup

```bash
npm install
cp .env.example .env   # optional; edit credentials
npm start
```

The server listens on `http://localhost:3000` by default. Open that URL in a browser for a test page with a form and a **Send POST /badge-server** button that renders the returned badge.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Listening port |
| `BADGE_USER` | `demo` | Expected username |
| `BADGE_PASSWORD` | `s3cret` | Expected password |

Credentials are compared in constant time. The defaults are sample values only. Set real values through the environment before using this beyond a demo.

## API

### POST /badge-server

Request body (JSON or form-encoded):

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `user` | yes | — | Must match `BADGE_USER` |
| `password` | yes | — | Must match `BADGE_PASSWORD` |
| `label` | no | `build` | Left-hand text, max 64 characters |
| `message` | no | `passing` | Right-hand text, max 64 characters |
| `color` | no | `green` | CSS color name or hex code |
| `labelColor` | no | `#555` | CSS color name or hex code |
| `style` | no | `flat` | `plastic`, `flat`, `flat-square`, `for-the-badge`, `social` |

Responses:

| Status | Body |
| --- | --- |
| `200` | SVG badge (`image/svg+xml`) |
| `400` | JSON error when the badge cannot be rendered |
| `401` | JSON error for invalid credentials |
| `405` | JSON error for any method other than `POST` |

### Example

```bash
curl -X POST http://localhost:3000/badge-server \
  -H 'Content-Type: application/json' \
  -d '{"user":"demo","password":"s3cret","label":"coverage","message":"99%","color":"brightgreen"}' \
  -o badge.svg
```

#### [Index.html](public/index.htl) test page

<img width="789" height="1035" alt="Screenshot 2026-08-31 at 08 38 47" src="https://github.com/user-attachments/assets/cc4c11f1-d434-4b42-834e-1230cb96f5d5" />


## License

MIT. See [LICENSE](LICENSE).
