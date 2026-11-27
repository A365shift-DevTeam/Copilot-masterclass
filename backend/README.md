# Masterclass admin

`Api/` is an ASP.NET Core 9 API on PostgreSQL. `admin/` is the admin UI (React + Vite), built into `Api/wwwroot` and served by the API, so the admin and API share one origin.

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
- **Special offers**: time-boxed discounts (% or ₹ off) on chosen programs, with presets (Black Friday, Christmas, New Year, Pongal, flash sale). While one runs the site shows the sale price, the struck-through normal price, a badge and a countdown, and switches back by itself at the end. Each program can have a sale payment link, because Razorpay and Trym charge what their own page says.
- **Settings**: Razorpay keys (test connection, sync recent payments), webhook setup, and the WhatsApp community link.
- **Team**: add and remove admins. A removed admin is signed out on their next request.
- **Activity**: every change, with who made it, plus each payment Razorpay delivered.
- **My account**: change your password. This signs out your other sessions.

## Razorpay keys

The Key ID, Key Secret and Webhook Secret can be saved on the Settings page. The secrets are encrypted with ASP.NET Data Protection and never sent back to the browser. A value saved there takes priority over `Razorpay:*` in appsettings.

The encryption keys live in `Api/App_Data/keys`, or in `DataProtection:KeysPath` if you set it. On Windows they're also protected with machine DPAPI. **Keep that folder between deploys.** If it's lost, everyone is signed out and the saved Razorpay secrets must be entered again.

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

Schema changes go through EF migrations (`dotnet ef migrations add <Name> --project Api`, from `backend/`; the tool is pinned in `.config/dotnet-tools.json`, so run `dotnet tool restore` first). `../database/schema.sql` is the idempotent SQL for a DBA to apply by hand:

```sh
dotnet ef migrations script --idempotent --project Api -o ../database/schema.sql
```
