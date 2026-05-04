# Office Walkabout

Small browser-based first-person 3D office prototype built with Three.js and Vite.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the URL printed by Vite. Controls: `WASD`, mouse look, left click to shoot, `Shift` to sprint.

## Photo assets

Put the provided photos here:

- `public/assets/office/open-office.jpg`
- `public/assets/characters/main-person.jpg`

The character manifest is at `public/assets/characters/manifest.json`. All current standees use `main-person.jpg`. You can move characters by editing their `position`, `scale`, and `rotateY`.

## Azure Static Web Apps

Recommended Azure target: **Azure Static Web Apps**.

Build settings:

- App location: `/`
- API location: leave empty
- Output location: `dist`
- Build command: `npm run build`

The project includes `staticwebapp.config.json` for SPA fallback and asset MIME types.

For local SWA CLI deployment, the project includes `swa-cli.config.json` with the `office-walkabout` configuration.
