# Masterclass admin

The API is ASP.NET Core 9 on PostgreSQL, in four projects (clean architecture; each depends only on the ones above it):

| Project | Holds |
|---|---|
| `Domain/` | Entities and their rules: programs, sessions, offers and sale pricing, payments, registrations. No dependencies. |
| `Application/` | One service per area (`Site/`, `Programs/`, `Ledger/`, `Settings/`, `Admins/`, `Reports/`) plus registration forms and Razorpay event handling. Talks to the outside through the interfaces in `Common/Abstractions.cs`. |
| `Infrastructure/` | EF Core + Npgsql (`AppDb`, migrations, seed), the encrypted settings store, the Razorpay HTTP client. |
| `Api/` | The host: sign-in, CORS, rate limits, and the routes in `Endpoints/`. A refused request is an `AppException`, answered as a problem with `detail`. |

`Api.Tests/` tests the pure rules in Domain and Application. `admin/` is the admin UI (React + Vite), built into `Api/wwwroot` and served by the API, so the admin and API share one origin.

What the admin manages:
- Program names, prices, payment links, session dates (IST), language, and whether each program shows on the site.
- The payments ledger: record, edit and delete payments, filter them, and export to CSV. Totals are on the Overview.

The site reads `GET /api/public/site` at load and renders from `frontend/src/data/content.js` first, then re-renders with the API values; if the API is down it stays on content.js.

## Configuration

Open `Backend.sln` in Visual Studio or Rider, or run `dotnet` from `backend/`.

| Setting | `Api/appsettings.Development.json` (local) | `Api/appsettings.json` (production) |
|---|---|---|
| `ConnectionStrings:Db` | local Postgres, `ambot_admin_dev` | replace the `YOUR_PROD_DB_HOST` / `CHANGE_ME` placeholders |
| `Admin:Email`, `Admin:Password` | a local test admin | the first admin; clear it after the first sign-in |
| `Razorpay:KeyId`, `KeySecret`, `WebhookSecret` | test webhook secret | optional; can be saved on the Settings page instead |
| `PublicSite:Origins` | Vite dev ports | https://learnai.ambot365.com (plus copilot.ambot365.com) |

`dotnet run` uses the Development file on top of `appsettings.json`. A published app uses `appsettings.json` only. Environment variables override both (`ConnectionStrings__Db`, `Admin__Password`, `Razorpay__WebhookSecret`), which keeps production passwords out of git.

```sh
cd backend/Api
dotnet run      # applies migrations, seeds programs from content.js, creates the admin
```

The admin from `Admin:*` is created only while none exists. After that, change the password on the Account page.

## Admin pages

- **Overview**: countdown to the next session, totals, 30-day chart, payments by program, latest payments.
- **Payments**: the ledger. Record, edit, delete, filter, export CSV. `#payments/new` opens the form; `#payments/unassigned` lists Razorpay payments with no program.
- **Customers**: one row per person (by email, else phone), with their payment history.
- **Programs & dates**: name, price, payment link, Razorpay ID, session date (IST), visibility, and a CSV of everyone who paid.
- **Registration forms**: every Pricing card has a form (Pricing page > Form). Fields of any type (text, email, phone, number, long text, dropdown, single or multiple choice, date); Full name and Email are built in. With Razorpay keys saved, Register on the website opens the form, the API creates a Razorpay order at the live price (offers included), Razorpay Checkout takes the payment, and the API verifies it (signature + fetching the payment) before the visitor reaches /thank-you. Answers are stored one row per field (`PaymentAnswers`), so they can be filtered and exported. The payment link decides it: a card with a link opens that link; a card with the link left empty uses its form and Razorpay (which needs the Razorpay keys saved).
- **Registrations**: one program at a time, a column per form field, filter by any field, CSV export with a column per field.
- **Special offers**: time-boxed discounts (% or ₹ off) on chosen programs, with presets (Black Friday, Christmas, New Year, Pongal, flash sale). While one runs the site shows the sale price, the struck-through normal price, a badge and a countdown, and switches back by itself at the end. Each program can have a sale payment link, because Razorpay and Trym charge what their own page says.
- **Settings**: Razorpay keys (test connection, sync recent payments), webhook setup, and the WhatsApp community link.
- **Team**: add and remove admins. A removed admin is signed out on their next request.
- **Activity**: every change, with who made it, plus each payment Razorpay delivered.
- **My account**: change your password. This signs out your other sessions.

## Razorpay keys

The Key ID, Key Secret and Webhook Secret can be saved on the Settings page. The secrets are encrypted with ASP.NET Data Protection and never sent back to the browser. A value saved there takes priority over `Razorpay:*` in appsettings.

The encryption keys live in `Api/App_Data/keys`, or in `DataProtection:KeysPath` if you set it. On Windows they're also protected with machine DPAPI. **Keep that folder between deploys.** If it's lost, everyone is signed out and the saved Razorpay secrets must be entered again.

## Look

The admin uses the Ambot365 Design System: `admin/src/design-system.css` (tokens and `ds-*` components) with `admin/src/ds-skin.css` mapping this app's components onto it. Dark mode is the `dark` class on `<html>`.

## Razorpay webhook

Razorpay Dashboard > Accounts & Settings > Webhooks > Add new webhook:
- URL: `https://<api host>/api/webhooks/razorpay`
- Secret: the same value as `Razorpay:WebhookSecret`
- Events: `payment.captured`, `payment.failed`, `refund.processed`

Each payment is recorded once, by its Razorpay payment ID, however often Razorpay retries. It's filed under the program whose **Razorpay page or link ID** (set on Programs & dates) appears in the payment. Failing that, it goes to the only program at that price. If neither works, it shows as Unassigned on the Payments page so you can pick the program.

## Tests

```sh
dotnet test Backend.sln   # webhook signature, parsing, program matching
```

## Admin UI

```sh
cd backend/admin
npm install
npm run dev     # http://localhost:5173, proxies /api to dotnet run on :5063
npm run build   # writes Api/wwwroot; run before dotnet publish
npm test
```

## Site wiring

The backend is the source of names, prices, links, dates, offers and the WhatsApp link: the site's loading screen waits for `GET /api/public/site` (not cached). If the API is down, the site falls back to the values in `content.js`. A production build fails unless `VITE_API_URL` is set; for local dev, `frontend/.env.development.local` points at `https://localhost:7179`.


Set `VITE_API_URL=https://<api host>` in `frontend/.env.local` (or the build env), then `npm run build` in `frontend/`.

## Database

Schema changes go through EF migrations (`dotnet ef migrations add <Name> --project Infrastructure --startup-project Api`, from `backend/`; the tool is pinned in `.config/dotnet-tools.json`, so run `dotnet tool restore` first). `../database/schema.sql` is the idempotent SQL for a DBA to apply by hand:

```sh
dotnet ef migrations script --idempotent --project Infrastructure --startup-project Api -o ../database/schema.sql
```

## Hosting on IIS (learnaiapi.ambot365.com)

One IIS site serves the API and the admin (`https://learnaiapi.ambot365.com` opens the admin).

1. **Server, once:** install the **.NET 9 Hosting Bundle**, then `iisreset`. PostgreSQL must be reachable from the server, with an empty database (e.g. `ambot_admin`).
2. **Publish:** run `backend\publish.ps1`. Copy everything in `backend\publish` to the site folder (e.g. `C:\inetpub\learnaiapi`).
3. **IIS site:** host name `learnaiapi.ambot365.com`, **https** binding with its certificate. App pool: **No Managed Code**, Integrated.
4. **Keys folder:** create `C:\inetpub\learnaiapi-keys` and give the app pool identity (`IIS AppPool\<pool name>`) Modify rights. It holds the encryption keys for sign-in cookies and saved Razorpay secrets; never delete it.
5. **Settings as app-pool environment variables** (they survive redeploys, unlike edits to the published web.config). Run once per value in an admin prompt:
   ```
   %windir%\system32\inetsrv\appcmd.exe set config -section:system.applicationHost/applicationPools /+"[name='<pool name>'].environmentVariables.[name='ConnectionStrings__Db',value='Host=…;Port=5432;Database=ambot_admin;Username=…;Password=…']" /commit:apphost
   ```
   Same for `Admin__Email`, `Admin__Password` and `DataProtection__KeysPath` (= `C:\inetpub\learnaiapi-keys`). Then recycle the app pool.
6. **First start:** browse to `https://learnaiapi.ambot365.com`. The database tables are created, programs seeded, and the first admin created from `Admin__*`. Sign in, change the password (My account), then remove the `Admin__Password` variable.
7. **Razorpay:** Settings → save the Key ID, Key Secret and Webhook Secret. In Razorpay, the webhook URL is `https://learnaiapi.ambot365.com/api/webhooks/razorpay`.
8. **Website:** `npm run build` in `frontend` (it reads `VITE_API_URL` from `frontend/.env.production`), upload `dist` to the learnai.ambot365.com site.

Check: `https://learnaiapi.ambot365.com/api/public/site` returns JSON. A 500.30 error means the app didn't start: set `stdoutLogEnabled="true"` in the site's web.config, create a `logs` folder, reload, and read the log.

Redeploying: run `publish.ps1` again and copy over the site folder (stop the app pool first, or drop an `app_offline.htm` in the folder while copying).
