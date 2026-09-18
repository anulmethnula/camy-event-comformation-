# CAMY Community Event

Responsive registration page with a Vercel serverless route at `/api/register`.

## Google Sheets connection

The existing Apps Script URL is retained as the default in `api/register.js`. The server now follows Google's redirects and requires an explicit JSON `{ "success": true }` before displaying a confirmed registration. HTML error pages, login pages and malformed responses are failures.

If the existing script is missing, private or incompatible:

1. Open the supplied Google Sheet, then **Extensions → Apps Script**.
2. Paste `google-apps-script/Code.gs` into the script editor. It targets the supplied spreadsheet and creates a separate **CAMY Registrations** tab, preserving existing tabs.
3. Choose **Deploy → New deployment → Web app**, execute as yourself, and allow access to **Anyone**. Authorize access to your spreadsheet.
4. Set the Vercel environment variable `GOOGLE_SCRIPT_URL` to the deployment's `/exec` URL and redeploy this repository. If updating the existing deployment instead, deploy a new script version through Manage deployments.
5. Make one clearly labeled test registration on the deployed page. Check its row in **CAMY Registrations** and verify the invitation download. Remove the test row afterward if desired.

A spreadsheet sharing link is not a write API. The Apps Script deployment must have permission to write to that sheet. Google describes deployment and redirect behavior in its [Content Service documentation](https://developers.google.com/apps-script/guides/content).

## Verification

Run `npm test` and `node --check app.js`. Tests exercise the submission API with mocked upstream responses; they do not write test data to the real spreadsheet. For local interactive use run `npx vercel dev` (a plain static file server cannot execute `/api/register`). Deployment is required to verify the real Google integration.

The included script validates inputs, protects against spreadsheet formulas, preserves phone numbers as text, and uses a lock plus registration references to prevent duplicates during retries. Public registration endpoints may need additional abuse protection if traffic grows.
