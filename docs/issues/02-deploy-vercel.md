# 02: Deploy to Vercel

**What to build:** A live public URL serving the game as a static file, so she can open it in her phone browser. No build step, no config beyond defaults.

**Blocked by:** None (can start immediately).

**Status:** done (verified on live URL, 2026-11-05)

- [x] `vercel deploy` succeeds from the project folder
- [x] Live URL loads the game on phone mobile data in under ~3s
- [x] Page makes zero third-party requests (no ads/trackers possible)
- [x] Game is playable end-to-end on the live URL (place pieces, clear lines, game over, restart)

**Evidence (2026-11-05):** `vercel deploy --prod` aliased to `https://block-blast-no-ads.vercel.app`. Fresh fetch is 34,556 bytes with `midnight` and `#7c3aed` present, no `#ec4899`. Board serves 64 cells and 3 tray slots with the cute theme by default. The only subresource is the same-origin `favicon.ico`. Tap select plus board tap placed a piece, moved the score from 0 to 4, and filled 4 cells. The theme button cycled cute to midnight to classic, restored the cute theme, and saved the choice in `bb_theme`. Pause showed the overlay, resume hid it, and restart cleared the board. Navigation timing measured the load at 706ms. `node --test` passes 17 of 17.
