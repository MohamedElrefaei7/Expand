# Expand

Expand is a privacy-first web app for turning one photo into a wall-sized composition made from ordinary printer paper. People will be able to upload an image, arrange separate, non-overlapping Letter or A4 tiles over it, preview the assembled result, and generate a print-ready multi-page PDF entirely in their browser.

## Project status

Milestone 0 is complete: the affine geometry proof passed automated checks and a physical two-page print test. Milestone 1 is now underway with a functional local-upload and wall-layout wireframe.

## Product constraints

- Everyday consumer audience
- Browser-only photo processing
- No accounts, uploads, or retained image data
- Desktop-first editor with responsive essential controls
- US Letter and A4 output
- Upright source photo spanning movable, rotatable, non-overlapping paper tiles
- Final visual identity deferred until the workflow is validated

## Documentation

- [System design plan](./SYSTEM_DESIGN_PLAN.md)
- [Project-local design context](./.impeccable.md)
- [Milestone 0 validation guide](./docs/MILESTONE_0.md)

## Local development

Requirements:

- Node.js 20.19 or newer
- npm 11 or newer

Install and run:

```sh
npm install
npm run dev
```

Quality checks:

```sh
npm run typecheck
npm test
npm run build
```

## Next milestone

Iterate the functional wireframe with real photos: refine templates and manipulation, add rotation-aware collision handling, then connect the editor to the proven print renderer.
