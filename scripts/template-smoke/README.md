# Template smoke automation (local only)

Playwright runner for small-batch live template generation checks.

## Two smoke goals (do not mix)

| Goal | Flag | Restriction field | What “success” means |
|------|------|-------------------|----------------------|
| **normal** | `--smoke-goal normal` (default) | Empty / no exact ban list | Template can produce **usable** output: `PASS`, copy/export/save on, UserUsage +1 |
| **safety** | `--smoke-goal safety` | Exact ban list (streamline, transform, effortlessly, …) | Enforcement works: model clean **or** validator blocks. `VALIDATION_FAIL` is **not** a failed smoke |

A safety `VALIDATION_FAIL` (e.g. model used `effortlessly` and the app blocked it) is a **safety PASS**, not a broken template.

## Setup

```bash
npm i -D playwright
npx playwright install chromium
```

```powershell
$env:E2E_BASE_URL="https://www.creatornivo.com"
$env:E2E_TEST_EMAIL="your-test-account@example.com"
$env:E2E_TEST_PASSWORD="***"
```

## Status model

### Dry-run

| Status | Meaning |
|--------|---------|
| `DRY_RUN_PASS` | Template selected; required fields filled; Generate enabled; no click |
| `DRY_RUN_INCOMPLETE` | Wrong template / missing required / Generate not ready |

### Normal generation (`--smoke-goal normal`)

| Status | Smoke success? | Meaning |
|--------|----------------|---------|
| `PASS` | yes | Usable body; **no app validation error** (anti-hype words = style warn only) |
| `VALIDATION_FAIL` | **no** | App/UI showed real validation error (`Output validation failed` / `output_validation_failed`) |
| `MODEL_REFUSAL_FAIL` | no | Model returned refusal / non-content (e.g. “I can't assist with that”) — not a scrape bug |
| `RESULT_DETECTION_FAIL` | no | Generation likely OK; scrape failed |
| `API_ERROR` / `GENERATION_TIMEOUT` / `UI_FAIL` | no | Infra / UX issues |
| `UNKNOWN_FAIL` | no | Unexpected automation exception only |

**Important:** In `normal`, configured safety phrases (`streamline`, `transform`, `effortlessly`, …) are **not** hard failures. Only the app validator / banner / API validation error yields `VALIDATION_FAIL`.

### Forbidden-phrase safety (`--smoke-goal safety`)

| Status | Smoke success? | Meaning |
|--------|----------------|---------|
| `SAFETY_PASS_MODEL_COMPLIANT` | **yes** | Model avoided banned phrases |
| `SAFETY_PASS_VALIDATION_BLOCKED` | **yes** | Model used banned phrase; validator blocked; actions off; UserUsage not +1 |
| `SAFETY_FAIL_LEAK` | no | Banned content still exportable / treated as success |
| `SAFETY_FAIL_QUOTA_ON_BLOCK` | no | UserUsage increased on validation block |
| `UNKNOWN_FAIL` | no | Automation exception only |

## Commands

```bash
# Dry-run (normal goal — no ban list in form)
node scripts/template-smoke/run.mjs --mode dry-run --smoke-goal normal

# Dry-run safety (fills ban-list restriction; still no Generate)
node scripts/template-smoke/run.mjs --mode dry-run --smoke-goal safety

# Normal generation batch (usable output) — costs OpenAI
node scripts/template-smoke/run.mjs --mode batch-smoke --smoke-goal normal --confirm-real-generations

# Safety single-template check
node scripts/template-smoke/run.mjs --mode batch-smoke --smoke-goal safety --templates landing-page-copy --confirm-real-generations

# Quota exhaustion (default: 15 focused templates, then 1 block check)
# Expect burn steps PASS; final row QUOTA_BLOCKED or QUOTA_EXHAUSTED
node scripts/template-smoke/run.mjs --mode quota-exhaustion --smoke-goal normal --confirm-real-generations
```

From 85/100 used, the default burn list spends **15** generations to reach **100/100**, then attempts **one** extra generation on `landing-page-copy`. The extra attempt must not increment UserUsage beyond the limit and must not produce exportable success content.

| Status | Meaning |
|--------|---------|
| `QUOTA_BLOCKED` | Expected block: Generate disabled, or API/UI quota refusal; **visible quota also at limit**; usage stable |
| `QUOTA_EXHAUSTED` | At limit after attempt with no usable/exportable output |
| `QUOTA_SOURCE_MISMATCH` | Product bug: API 429 `quota_exceeded` while visible banner still has remaining (not a template fail) |
| `QUOTA_LEAK` | Fail: usage past limit, or exportable content on a block attempt |

Offline tests (no browser / no OpenAI):

```bash
node scripts/template-smoke/detect.test.mjs
node scripts/template-smoke/fixtures.test.mjs
```

**Slug aliases (smoke-runner only):** title-derived or shortened batch slugs map
to catalog slugs before schema load, fixtures, navigation, and reports:

| Requested (alias) | Canonical catalog slug |
|-------------------|------------------------|
| `short-form-video-script` | `short-form-video` |
| `ux-copy` | `in-app-ux-copy` |

Report rows include `requestedTemplate`, `canonicalTemplate`, and `aliasApplied`.

## Reports

`smoke-reports/template-smoke-YYYY-MM-DD.{md,json}` include `smokeGoal`, `smokeGoalSuccess`, scrape/API/quota diagnostics.

## Safety

- Password never printed
- Real generation modes require `--confirm-real-generations`
- Never runs all 45 templates by default
- `quota-exhaustion` burns the default list **once** (no 120× cycle), then one block check and stop
- Stops on login failure, quota exhaustion (batch-smoke), or 2 consecutive `UNKNOWN_FAIL`
