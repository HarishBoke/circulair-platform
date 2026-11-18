# Cashfree sandbox checkout

Cashfree is the selected gateway for the current India-first test-payment exercise. The application includes a separate `/payments/test` page, also linked as **Cashfree Test (gated)** in developer navigation. It is a gateway exercise, not a battery purchase or credit top-up. It is disabled by default and has not yet been activated on Render or tested against the owner’s Cashfree account.

The fixed test amount is **₹10.00 INR**, represented internally as 1,000 paise. The server submits Cashfree’s major-unit `order_amount` as exactly `10`, not `1000`. The browser cannot choose an amount or currency. No platform credit, balance, battery ownership, listing status or seller payout changes result from this exercise.

## What a reviewer does

Sign in using the platform’s own email/password account. Complete the cookie-consent choice normally. Open `/payments/test`. An account without approved test access sees a disabled checkout button; this is expected, not a request to bypass authorization.

After an administrator enables sandbox testing for the reviewer’s existing user ID, click **Open Cashfree TEST checkout · ₹10.00**. The application loads the official SDK only on this explicit action and opens it in `sandbox` mode. Use only Cashfree’s documented test details in the hosted modal. For a supported UPI test, `testsuccess@gocash` simulates success and `testfailure@gocash` simulates failure. These are public fixtures, not personal bank accounts.[1]

A modal completion, redirect or success-looking SDK message is not confirmation. The server fetches the bound order, payment attempts and refund records. **Test payment verified** appears only for the expected owned ₹10 INR order with one successful captured payment, `PAID` order status and no refund record. Pending, failed, cancelled, expired, authorization-only and refunded states remain non-successful. Amount/currency mismatches, unsupported responses and ambiguous successful attempts fail closed.[2] [3] [6]

**Recheck payment** verifies the same current test order without opening another checkout. A loading failure, modal close or SDK error also triggers server verification, since an SDK error does not establish whether payment occurred. SDK loading is bounded to 10 seconds; a non-resolving checkout is bounded to two minutes, after which the page checks server status and permits retry. This does not cancel a payment or turn a pending payment into a failure.

The page keeps its recheck context only in memory. Leaving or reloading the page clears it. The signed context expires after 15 minutes. This deliberate limitation is suitable for a non-fulfilling gateway exercise; it is not a durable purchase history, wallet or financial ledger.

## Administrator setup on Render

Use **Payment Gateway** credentials, not Payouts or Secure ID credentials. In the Cashfree Merchant Dashboard, choose **Switch to Test**, then **Developers → API Keys**. Test and production environments have separate credentials; test keys can be available before production account activation. Keep the Client Secret server-side and never paste either credential into a public issue or this guide.[4]

Configure the existing Render application service with the following server environment variables. Do not create a new service or database for this exercise:

```dotenv
CASHFREE_SANDBOX_ENABLED=false
CASHFREE_MODE=sandbox
CASHFREE_TEST_CLIENT_ID=
CASHFREE_TEST_CLIENT_SECRET=
CASHFREE_SANDBOX_ALLOWED_USER_IDS=
```

Enter the actual test Client ID and Client Secret through secure environment settings, not a repository file. The allowed-user field is a comma-separated list of existing positive integer platform user IDs, with no spaces, empty entries, duplicates or leading zeroes. Do not promote accounts, seed new accounts or rewrite customer records merely to run this test. Set the enable flag to the exact lowercase `true` only after the reviewed source is deployed, test credentials are verified and a reviewer is allowlisted.

Cashfree requires the website domain to be whitelisted before hosted checkout. Whitelist the actual Render/custom-domain origin used by this application, rather than an unrelated preview origin.[5] The application’s production CSP keeps frames blocked by default. Explicit sandbox mode permits only `https://payments-test.cashfree.com` and `https://sandbox.cashfree.com`; it does not permit wildcard or production checkout frames.

The backend fixes its API origin to `https://sandbox.cashfree.com/pg` and pins `x-api-version: 2026-01-01`. There is no production endpoint switch or automatic fallback. API requests stay on the server, have ten-second deadlines and bounded response bodies, reject redirects and suppress raw provider/customer errors. Orders receive server-generated IDs and UUID idempotency keys; an ambiguous order-creation timeout is not automatically retried.[2] [4]

Each signed context is bound to its authenticated user, minted order ID, Cashfree order ID, opaque test customer ID, fixed amount/currency, provider/scope, expiry and credentials. The server uses a domain-separated HMAC and timing-safe verification before provider reads. Three create operations and twelve verification operations per user per minute are permitted, in addition to existing API limits. These are process-local single-instance abuse limits, not a durable financial transaction ledger.

## What remains before an actual gateway acceptance claim

The owner’s Cashfree sandbox account must be connected and test credentials securely configured on Render. Then test success, failure, cancellation, pending/recheck and timeout behavior against the actual gateway and record the server-confirmed provider IDs and outcomes. Separately verify the current account’s payment-method availability and whitelist configuration. The existing refund-list endpoint is documented, but its acceptance with the pinned current API header still needs the actual provider test; unsupported responses will fail closed.[3]

Offline tests and browser-wire fixtures validate application logic but do not prove a successful Cashfree payment. No actual Cashfree order/payment, production credential, refund, payout or historical webhook replay has been executed as part of this implementation stage. No production migration is required or applied for this stateless gateway exercise.

The earlier owner question about sold listings is resolved: the owner confirmed that all 22 sold listings are demo/test data. Their records were not changed. Historical provider continuity has not been independently audited. That is separate from the now-resolved demo classification and does not authorize enabling legacy settlement code.

## Boundaries for the next payment phase

Marketplace purchases and seller acceptance remain blocked by the existing unconditional safeguard. Platform credit management, organizational-versus-individual billing rules, durable order ownership, exactly-once credit allocation, subscriptions, refunds, disputes, seller onboarding and payouts need their own reviewed implementation and acceptance. This page implements none of those as a side effect.

International currencies and live eligibility are not activated by an INR sandbox test. Do not promise worldwide acceptance, currency conversion, financial settlement or 100% uptime from these results. Any next schema migration, live-money action or seller-payout activation requires a separately reviewed scope.

The deployed application remains independent: its login is native JWT/email-password, its server calls Cashfree directly and its secrets belong in Render. Temporary operator account access is not an application runtime or login dependency.

## Completed application QA — 18 November 2026

The matching candidate passed 68 offline application suites: 2,162 tests passed and 28 explicitly opt-in PostgreSQL tests were skipped, for 2,190 collected tests. This run used Node 24.14.1 with harmless CI fixtures and no provider credentials. The Cashfree adapter contributes 225 offline cases; its router and native HTTP protections contribute 21 more. TypeScript passed with zero diagnostics. Clean-environment frontend, server and real incident-worker builds passed.

All 28 focused Cashfree desktop/mobile Chromium browser cases passed, covering authorization, default-off behavior, fixed amount, server-authoritative success, six non-success states, same-order retries, SDK/verification failures and a stalled checkout deadline. The existing full Chromium suite also passed 178 of 178. Both runs used one worker, no retries, no skips and no flaky results, with external providers blocked and browser-wire fixtures. Each owned local QA server was stopped and its port verified closed. Native disabled-worker acceptance passed 8 of 8 and offline gateway Python tests passed 50 of 50.

Initial failures were retained rather than hidden: one CSP assertion used a substring that accidentally matched literal HTTPS origins; the first clean build omitted pnpm from its PATH; an exact-runtime run omitted existing access-gate CI fixtures; and six desktop retry tests did not dismiss the normal cookie-consent dialog. These test/setup issues were corrected without weakening authentication, consent or marketplace safeguards, then the affected complete suites were rerun successfully.

These results do not constitute an actual Cashfree payment, production login/mutation acceptance, fresh production database proof, penetration-test certification or an uptime guarantee. Strix has not been run. Dependency/security findings from the earlier delivery remain separate open work. The Cashfree source is a tested, default-off release candidate; activation and its actual gateway test remain pending.

## References

[1]: https://www.cashfree.com/docs/api-reference/payments/data-to-test-integration "Cashfree sandbox test payment data"
[2]: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order "Cashfree create order API"
[3]: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/get-refunds-for-order "Cashfree read-only order refund lookup"
[4]: https://www.cashfree.com/docs/api-reference/authentication "Cashfree server authentication and test credentials"
[5]: https://www.cashfree.com/docs/payments/online/web/redirect "Cashfree hosted web checkout and server confirmation"
[6]: https://www.cashfree.com/docs/api-reference/payments/latest/payments/get-payments-for-an-order "Cashfree authoritative payment attempts and capture status"
