# AI Funding Policy

**Implemented:** 2026-10-03, first slice of SaaS Phase 2.

## Configuration

The shared AI client resolver requires explicit authorization before using a server API key. Both provider allowlists are server-only, optional environment variables:

```env
OPENROUTER_FUNDED_MODELS=
OPENAI_FUNDED_MODELS=
```

Keep these empty to disable server-funded AI. To enable funding, set the appropriate variable to exact, comma-separated model IDs reviewed for that provider. Entries are trimmed; prefixes, suffix rules, and wildcard expansion are not supported. A `:free` suffix does not automatically authorize a model. Review availability, pricing, and data handling before adding any ID.

`OPENROUTER_API_KEY` remains required by the existing environment schema; `OPENAI_API_KEY` remains optional. An allowlist does not supply a key. These variables do not belong in `NEXT_PUBLIC_` configuration. Restart or redeploy after changing environment configuration.

No real keys or deployment allowlists were modified during implementation. Existing stored model choices were not rewritten. An existing choice now requires either a compatible personal key or an explicit platform allowance.

## Routing Contract

For each call to `resolveAiClient(model, credentials)`:

1. A native OpenAI model ID with a nonblank personal OpenAI key uses that key.
2. Otherwise, a nonblank personal OpenRouter key takes priority over all server keys.
3. Otherwise, a native OpenAI model ID can use the server OpenAI key only if its exact ID is in `OPENAI_FUNDED_MODELS` and the server key is nonblank.
4. Otherwise, the server OpenRouter key can be used only if its exact ID is in `OPENROUTER_FUNDED_MODELS` and the server key is nonblank.
5. Otherwise, resolution throws a `FORBIDDEN` tRPC error before any AI provider request.

Native OpenAI model recognition retains the existing `gpt-`, `o1-`, `o3-`, and `o4-` prefixes. Provider-qualified IDs go through OpenRouter. A personal OpenAI key cannot pay for an incompatible model.

Approval for one provider does not approve another. If a direct server key is missing, OpenRouter can only be selected if separately approved. Once a client is selected, provider failures do not switch to another key or provider. The existing SDK retry behavior is unchanged; bounding retries belongs to the remaining Phase 2 work.

Server authorization is checked before cached clients are returned. Separate personal keys retain separate cached clients.

The resolver is shared by outreach generation, CV extraction, job-fact extraction, fit reports, and job documents. No caller signatures or database schema were changed.

## Remaining Controls

This allowlist is not a spending meter or a public-launch gate. It can authorize a paid model if the operator deliberately adds one; it does not verify prices automatically.

Atomic quotas, shared budgets, verified-account admission, bounded input/retries, and cost reconciliation remain unimplemented. Personal keys still pass through the existing application usage controls; this change does not remove those controls. Some services currently consume quota before resolving the client, so a funding-policy rejection may still consume an allowance. Admission ordering must be addressed with the quota changes.

Registration remains closed. No migrations or live integration tests were run against the personal database.

## Verification

The policy tests use the real OpenAI SDK clients with fake configuration and keys, without issuing provider requests. The original implementation failed 13 of the 20 policy tests before the fix.

| Check | Result |
| --- | --- |
| Funding-policy tests | 20 passed. |
| Full default suite | 397 passed, zero failed, 64 skipped; 39 files passed, 10 skipped. |
| TypeScript | `tsc --noEmit` passed. |
| Lint | Zero errors; existing React Hook Form/React Compiler warning remains. |
| Production build | Passed on Next.js 16.2.6; existing Sentry `disableLogger` deprecation warnings remain. |

The default suite explicitly used `SCRAPER_INTEGRATION=0` and `SCRAPER_CANARY=0`. Skipped integration and live-source coverage remain unverified.
