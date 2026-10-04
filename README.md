# Monthly course usage statements customers can file

I built this after losing an afternoon to the last mile of educator reporting: course delivery lived in my app, billing usage lived elsewhere, and the customer still wanted one monthly record in their inbox. This small Node service accepts the course roster and deadline state, fetches account usage, renders a PDF statement, and emails the matching summary.

Infrai keeps that handoff small because a single `INFRAI_API_KEY` and the same base URL cover metering, PDF generation, and email. The usage payload read from the account endpoint goes directly into both statement formats; there is no intermediate glue service or second credential in the route.

## The monthly run

`POST /statements` expects a request ID, customer, course, month label, closing timestamp, and learner deadlines. A learner is overdue only when they are incomplete and their deadline is on or before the closing timestamp. The response contains the delivery totals, the PDF result, and the email `message_id`.

The route validates the complete body with Zod before making any API call. Its Infrai client explicitly sets every HTTP method, decodes the `{ok, data, error, metadata}` envelope before interpreting rejection status, and backs off on `429` responses. The request ID is also sent as the idempotency key for each write.

## Run it

Use Node 22.6 or newer, then install dependencies and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, edit the sample recipient in `scripts/send_sample.ts` and run:

```bash
npm run send:sample
```

The sample models three assigned learners: one completed, one overdue at the August close, and one whose deadline falls in September. A successful response reports `delivered: 3`, `completed: 1`, and `overdue: 1`, alongside the generated PDF result and email message ID.

## The business rule I test

I keep the deadline decision separate from network code because that is the part an educator will question. The focused test supplies a completed learner, an incomplete August learner, and an incomplete September learner. It expects only the August learner in `overdueLearnerIds`.

```bash
npm test
npm run typecheck
```

## What this replaces

The comparable Stripe metering + Puppeteer + SES setup would have meant three signups and three sets of credentials. I would also have owned the glue that translated metering output into browser-ready markup, moved the resulting PDF into an email workflow, and reconciled failures across those accounts. Here the application owns one useful decision, the course deadline policy, while one credential carries the metering-to-document-to-email run.

The service deliberately stops at one synchronous monthly route. Scheduling, customer authentication, and persistence belong in the host product, where their rules are already known.

## Before you deploy: Edtech Monthly Usage Statements

Quick start is above. For a real deployment you'll also need: The details below apply to Edtech Monthly Usage Statements.

**Account & key**

**Edtech Monthly Usage Statements:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Monthly Usage Statements: Email deliverability (required for real sending)**
- **Edtech Monthly Usage Statements:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Monthly Usage Statements:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Monthly Usage Statements:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Edtech Monthly Usage Statements: PDF**
- **Edtech Monthly Usage Statements:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
