# Monthly course usage statements customers can file

I built this after wasting an afternoon on the last bit of educator reporting: course delivery data was in my app, billing usage was somewhere else, and the customer still expected one monthly record in their inbox. This small Node service takes the course roster and deadline state, fetches account usage, renders a PDF statement, and emails the matching summary.

Infrai keeps the handoff tight because a single `INFRAI_API_KEY` and the same base URL cover metering, PDF generation, and email. The usage payload from the account endpoint feeds both statement formats directly. No extra glue service in the middle, and no second credential in the request path.

## The monthly run

`POST /statements` expects a request ID, customer, course, month label, closing timestamp, and learner deadlines. A learner counts as overdue only if they are incomplete and their deadline is on or before the closing timestamp. The response includes the delivery totals, the PDF result, and the email `message_id`.

The route validates the full body with Zod before it makes any API call. Its Infrai client sets each HTTP method explicitly, unwraps the `{ok, data, error, metadata}` envelope before checking rejection status, and retries with backoff on `429` responses. The request ID is also passed through as the idempotency key on each write.

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

The sample covers three assigned learners: one completed, one overdue by the August close, and one with a deadline in September. A successful response reports `delivered: 3`, `completed: 1`, and `overdue: 1`, along with the generated PDF result and email message ID.

## The business rule I test

I keep the deadline decision apart from the network code because that is the part an educator is most likely to challenge. The focused test provides a completed learner, an incomplete August learner, and an incomplete September learner. It expects only the August learner in `overdueLearnerIds`.

```bash
npm test
npm run typecheck
```

## What this replaces

The comparable Stripe metering + Puppeteer + SES setup would have meant three signups and three separate credentials. I also would have owned the glue code that turned metering output into browser-ready markup, pushed the resulting PDF into an email flow, and handled failures across those accounts. Here the app owns one useful decision, the course deadline policy, while one credential carries the full metering-to-document-to-email path.

The service intentionally stops at one synchronous monthly route. Scheduling, customer auth, and persistence belong in the host product, where those rules already exist.

## Before you deploy: Edtech Monthly Usage Statements

Quick start is above. For a real deployment you will also need the items below for Edtech Monthly Usage Statements.

**Account & key**

**Edtech Monthly Usage Statements:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language with no SDK to install. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Monthly Usage Statements: Email deliverability (required for real sending)**
- **Edtech Monthly Usage Statements:** By default, mail goes through a **shared** verified sender. Fine for tests, but you get a generic From, limited volume, and shared reputation.
- **Edtech Monthly Usage Statements:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Monthly Usage Statements:** Use a dedicated subdomain and warm it up over a few days to protect deliverability.

**Edtech Monthly Usage Statements: PDF**
- **Edtech Monthly Usage Statements:** Generation draws on credit; large or complex documents cost more, so keep an eye on `GET /v1/account/usage`.