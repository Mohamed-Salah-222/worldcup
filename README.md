# World Cup Predictions

MERN monorepo scaffold for a World Cup predictions app.

## Setup

1. Copy `.env.example` to `.env` in both `server/` and `client/`, then fill values.
2. Run `npm run install:all` from the root.
3. Run `npm run dev` from the root.
4. Client: http://localhost:5173, Server: http://localhost:4000/api/health

## Server Utilities

From `server/`:

- Promote a user to admin: `npm run promote -- myusername`
- Run a one-time World Cup match sync: `npm run sync:matches`
