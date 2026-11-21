# Undying Earth

2D open-world zombie survival with base defense. Looping world, multiple bases, survivors with skills, win by clearing every zombie.

## Status
Foundation only (v0.0.1). Not playable yet.

## Security notes
- Strict CSP (meta tag + `_headers`): no inline scripts, no third-party scripts, no framing.
- All saves and imports are treated as untrusted: size cap, prototype-pollution-safe parse, schema validation, checksum.
- Client-side code is visible and editable by players. The save checksum only catches corruption and casual edits.
  Anything that must be trustworthy (leaderboards, purchases, accounts) needs a server that validates it.

## Run locally
Use any static server (ES modules do not work from file://), e.g. `npx serve .`
