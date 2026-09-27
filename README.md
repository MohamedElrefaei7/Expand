# Expand

Expand is a privacy-first web app for turning one photo into a wall-sized composition made from ordinary printer paper. People will be able to upload an image, arrange and rotate Letter or A4 sheets over it, preview the assembled result, and generate a print-ready multi-page PDF entirely in their browser.

## Project status

The product and system design are complete. The repository currently contains a minimal React/TypeScript application shell so implementation can begin with the highest-risk milestone: proving the geometry for rotated sheets and physically assembled output.

## Product constraints

- Everyday consumer audience
- Browser-only photo processing
- No accounts, uploads, or retained image data
- Desktop-first editor with responsive essential controls
- US Letter and A4 output
- Upright source photo beneath movable and rotatable paper windows
- Final visual identity deferred until the workflow is validated

## Documentation

- [System design plan](./SYSTEM_DESIGN_PLAN.md)
- [Project-local design context](./.impeccable.md)

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
npm run build
```

## Next milestone

Build a framework-independent affine-transform proof that demonstrates a photo remains upright across independently rotated paper sheets, then verify the result with a two-page physical print fixture.

