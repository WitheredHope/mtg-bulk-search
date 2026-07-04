# MTG Bulk Search

A web app for searching through bulk Magic: The Gathering cards and knowing where to look for them. Paste in a card list, and it shows you which sets your cards appear in (using the [Scryfall API](https://scryfall.com/docs/api)), so you can flick through your bulk boxes set by set.

Runs entirely locally — card lists and custom set groups are stored in a JSON file on disk. No accounts, no cloud services.

## Running with Docker (recommended)

```bash
docker compose up -d --build
```

Then open http://localhost:3000.

Your saved lists and set groups are stored in `./data/db.json` (mounted into the container), so they survive rebuilds and restarts. Back up that one file to back up everything.

## Running without Docker

```bash
npm install
npm start
```

This builds the frontend and serves everything at http://localhost:3000.

## Development

Run the API server and the Vite dev server in two terminals:

```bash
npm run server   # API + data storage on port 3000
npm run dev      # Vite dev server on port 5173 (proxies /api to port 3000)
```

Then open http://localhost:5173.

## Features

- Paste a card list (supports `2 Card Name`, `2x Card Name`, `Card Name x2`, `Card Name (2)`)
- See every physical set each card was printed in
- Group results by set, custom set groups, or colour
- Filter by rarity, hide duplicates, and mark cards as found while you search
- Card image previews on hover
- Save and reload card lists

## Technologies

- React + TypeScript + Vite
- React Router
- Plain Node.js API server (zero runtime dependencies) with JSON file storage
- Scryfall API for card data
