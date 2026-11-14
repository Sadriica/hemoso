---
name: demo-and-screenshots
description: "How to prepare the demo: a fixed story path, an end-to-end test, accessibility check, screenshots for the video and the public link."
---
# Demo and screenshots

1. Agree with Bio 1 one fixed story path through the solution (written in
   `submission/video.md`) once the solution exists.
2. A Playwright end-to-end test walks that path and fails on console errors or
   failed requests; `@axe-core/playwright` checks each screen.
3. Screenshots at 1280 × 800 of every step for the video.
4. Public link per `docs/DEPLOY.md`; check it in a private window, not signed in.
5. Rehearse the path until it takes under 90 seconds without thinking.
