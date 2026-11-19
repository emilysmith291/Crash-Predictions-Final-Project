# Crash Severity Estimator (D5 frontend)

Next.js site that calls the live Modal API
(`https://emilysmith291--crash-severity-api-web.us-east.modal.run`) to estimate the chance
that a vehicle in a reported crash has an occupant killed or seriously injured.

- Dropdowns are filled from the API's `GET /options`.
- `POST /predict` gives the estimate; four extra calls give the "What if…" comparisons.
- Loading states: skeletons, a spinner on the button, and a "waking up the model" note when
  the API is starting from idle (it scales to zero).
- Error states: API unreachable or timed out (with retry), 422 field errors, 503 model unavailable.

## Run locally

```bash
npm ci
npm run dev        # http://localhost:3000 (calls the deployed API)
```

## Deploy (Vercel via GitHub)

1. Push this folder to its own GitHub repository.
2. In Vercel: Add New -> Project -> import the repository (framework: Next.js).
3. Environment variable: `NEXT_PUBLIC_API_URL` = the Modal API URL (see `.env.example`).
4. Deploy.
