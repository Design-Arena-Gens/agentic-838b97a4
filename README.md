# Quality Signal Control Room

Quality Signal Control Room is a Vercel-ready Next.js application that simulates an automated testing command center. Monitor the health of key test suites, launch targeted runs, and keep a concise activity trail without leaving the browser.

## Highlights

- Interactive dashboard with live status filters, ownership views, and execution stats.
- Bulk execution trigger that queues non-passing test cases and animates status transitions.
- Rich test definition cards with category badges, historical telemetry, and tag chips.
- Guided form for creating new test artifacts complete with ownership and tagging recommendations.
- Activity log that records every action with contextual severity indicators.

## Getting Started

Install dependencies (already done if you used `create-next-app`):

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The application is now available at [http://localhost:3000](http://localhost:3000). The dashboard is fully client-side, so changes to components automatically refresh in the browser.

## Available Scripts

- `npm run dev` – start the local development server.
- `npm run lint` – run ESLint and surface any code quality issues.
- `npm run build` – create an optimized production build.
- `npm start` – serve the production build locally (runs `npm run build` first if needed).

## Project Structure

```
src/
  app/
    layout.tsx     # Global layout, metadata, and theme wiring
    page.tsx       # Home route rendering the dashboard
    globals.css    # Design tokens and component styling
  components/
    TestDashboard.tsx  # Interactive dashboard and subcomponents
  data/
    initial-tests.ts   # Seed data for simulated test inventory
  types/
    tests.ts           # Shared TypeScript definitions
```

## Deployment

The project is optimized for seamless deployment to Vercel. Generate a production build with `npm run build`, then deploy using the Vercel CLI (already configured in this environment):

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-838b97a4
```

Allow a few seconds for DNS propagation, then verify the deployment:

```bash
curl https://agentic-838b97a4.vercel.app
```

