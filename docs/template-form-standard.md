# Creatornivo template form and Help standard

Last updated: 2026-07-11

This standard exists to protect the finished main prompt for each template.
When the task is to create or improve a form and Help article, the prompt is not
the work surface. The prompt is the source of truth.

## Core rule

Do not rewrite, shorten, improve, restructure, or add requirements to an
existing finished prompt while creating a form or Help article.

The form and Help layer must explain and collect the parameters already used by
the prompt. If a prompt needs editorial changes, that must be a separate task
with explicit approval.

## Source files

- Main prompt: `prisma/template-prompts/<slug>.txt`
- Catalog: `prisma/templates-catalog.json`
- Full form schema: `src/config/template-forms/<slug>-variables.json`
- Form wrapper: `src/config/template-forms/<slug>.ts`
- Help page: `src/app/(protected)/generate/guides/<slug>/page.tsx`
- Help button registry: `src/components/generate/template-help-button.tsx`
- Shared Help UI: `src/components/generate/template-field-guide.tsx`
- Form UI: `src/components/generate/template-parameters-form.tsx`
- Template types: `src/types/template.ts`
- Prompt filling and validation: `src/lib/templates/utils.ts`

## Step 1: read the full prompt

Before touching a template form:

1. Open `prisma/template-prompts/<slug>.txt`.
2. Read the whole prompt, not just the input block.
3. Identify the intended output structure.
4. Identify all `{{...}}` variables.
5. Keep the variable names exactly as the prompt uses them unless there is a
   technical bug that requires a separately approved correction.

## Step 2: extract variables from the prompt

Extract every placeholder matching:

```text
{{variableName}}
```

Treat the prompt as the source of truth. The final form must include one field
for each prompt variable.

Recommended local check:

```text
Compare variables extracted from prisma/template-prompts/<slug>.txt with keys in
src/config/template-forms/<slug>-variables.json.
```

Watch for edge cases:

- Repeated variables count as one form field.
- Numeric placeholders such as `{{1}}`, `{{2}}`, `{{3}}` may be intentional
  examples for platform templates. Do not silently convert them into user-facing
  form fields; flag them for prompt-owner review.
- Do not add a field just because it would be useful. If the prompt does not use
  the variable, it needs either a prompt change task or a documented exception.

## Step 3: map variables to form fields

For every prompt variable, create one `TemplateVariable` entry with:

- `key`
- `label`
- `required`
- `type`
- `placeholder`
- `hint`
- `help`
- `group`
- `groupTitle`
- `fullWidth` when useful
- `options` for select fields
- `defaultValue` only when it is truly safe
- `showWhen` only for conditional fields that should stay hidden until relevant

The `key` must match the prompt variable exactly.

## Field type rules

Current supported field types are:

- `text`
- `textarea`
- `select`
- `number`

Use only supported types unless the UI and type definitions are intentionally
expanded in a separate task.

### Use `text` for

- short names;
- single URLs, until a dedicated URL type exists;
- single dates, until a dedicated date type exists;
- short locale, market, or language values;
- one-line CTA text.

### Use `textarea` for

- source notes;
- facts and key points;
- restrictions;
- audience context;
- brand voice;
- examples;
- long product or offer descriptions.

### Use `select` for

- constrained choices;
- tone presets;
- format choices;
- yes/no/auto controls;
- output modes where free text would create inconsistent results.

### Use `number` for

- counts;
- durations;
- word counts;
- variant counts.

Do not use `text` for a long brief just because it is faster to define. If the
user is expected to paste notes, examples, restrictions, or multiple facts, use
`textarea`.

## Required and optional rules

Required fields should be the minimum set needed for a useful, safe first
generation.

Make a field required when the prompt cannot produce a coherent output without
it, such as:

- topic or subject;
- primary goal;
- target audience;
- core message or offer;
- factual basis for fact-sensitive templates;
- output language when the prompt expects it as a core input.

Make a field optional when:

- the prompt can make a neutral choice when blank;
- the information is only relevant to a specific context;
- the value is compliance, evidence, SEO, or CTA detail that may not exist.

If a field is optional, Help must clearly say when to leave it blank.

## Label rules

Labels should be clear, human-readable, and specific.

Good labels:

- `Target Audience`
- `Facts and Key Details`
- `Destination URL`
- `Claims or Wording to Avoid`

Bad labels:

- `Input 1`
- `Misc`
- `Info`
- `Topic Stuff`
- raw camelCase such as `targetAudience`

The label should explain the user-facing concept, not the internal variable
name.

## Placeholder rules

Placeholders should show a realistic value or a clear instruction.

Good placeholders:

- `Example: freelance designers, SaaS founders, HR managers`
- `Paste approved notes, research, product information, or source excerpts.`
- `https://www.creatornivo.com/pricing`
- `Only if confirmed; otherwise leave blank.`

Bad placeholders:

- `Enter value`
- `Optional`
- `Lorem ipsum`
- `Something here`
- an invented testimonial, metric, customer, rating, or fake urgency claim.

Never use placeholders that imply fake social proof, fake scarcity, or
unverified results.

## Helper text rules

Each field needs short helper text in `hint`.

The hint should answer: what should the user put here right now?

Good helper text:

- `Include only facts that may safely appear in the post.`
- `Select the single most important result this content should support.`
- `Add the exact page readers should visit when the content requires a link.`

Bad helper text:

- `Required field.`
- `Used by the model.`
- `Fill this out.`
- long Help-article content copied into the form.

Keep the form hint short. Put deeper guidance in the Help article.

## Default value rules

Use `defaultValue` only when the default is safe, neutral, and useful.

Good defaults:

- `English` for output language when the product defaults to English.
- `Auto` for format or CTA behavior.
- `Clear and natural` for tone when that is the intended neutral default.

Avoid defaults for:

- facts;
- metrics;
- claims;
- URLs;
- dates;
- personal stories;
- customer names;
- legal or compliance statements.

## Help article structure

Each migrated template needs a route:

```text
src/app/(protected)/generate/guides/<slug>/page.tsx
```

The Help page should use the shared `TemplateFieldGuide` component unless there
is a strong reason not to.

The page should include:

1. template-specific title;
2. short intro that explains how to use the form;
3. quick-start steps;
4. groups matching the form schema;
5. every field documented through the field's `help` object;
6. a back link to `/generate?template=<slug>`;
7. auth protection via `requireSession()`.

## Help content for one field

Every field's `help` object must include:

- `what`: what the field is;
- `why`: why it changes the output;
- `example`: one good value;
- `avoid`: what the user should not put there.

Example:

```json
{
  "key": "targetAudience",
  "label": "Target Audience",
  "placeholder": "Example: freelance designers, SaaS founders, HR managers",
  "required": true,
  "type": "text",
  "hint": "Describe the professionals or decision-makers the content should speak to.",
  "help": {
    "what": "The specific reader group for this content.",
    "why": "Audience changes vocabulary, examples, depth, objections, and CTA.",
    "example": "Solo SaaS founders who publish weekly on LinkedIn.",
    "avoid": "Everyone, vague demographics, or invented customer segments."
  }
}
```

## Help button integration

After adding a Help page:

1. Export `<TEMPLATE>_GUIDE_PATH` from `src/config/template-forms/<slug>.ts`.
2. Import it in `src/components/generate/template-help-button.tsx`.
3. Add the slug to `GUIDE_PATH_BY_SLUG`.
4. Verify the button appears in the Parameters card for that template.
5. Verify the link opens the correct route for the current template, not a
   nearby or generic article.

## Good and bad field examples

Good:

```json
{
  "key": "claimsToAvoid",
  "label": "Claims or Wording to Avoid",
  "placeholder": "Example: no guarantees, no competitor comparisons, avoid \"best\"",
  "required": false,
  "type": "textarea",
  "hint": "List prohibited claims, sensitive terminology, or legal and brand restrictions.",
  "help": {
    "what": "Known claims, phrases, or angles the output must not use.",
    "why": "It protects against brand, regulatory, contractual, and factual risks.",
    "example": "No earnings guarantees; avoid calling the product the best on the market.",
    "avoid": "Leaving known legal or brand restrictions out of the form."
  }
}
```

Bad:

```json
{
  "key": "extraIdeas",
  "label": "Extra ideas",
  "required": false,
  "type": "text",
  "placeholder": "Anything",
  "hint": "Optional"
}
```

Why it is bad:

- the field may not exist in the prompt;
- the label is vague;
- the placeholder is not realistic;
- the hint is not useful;
- there is no Help content;
- a long miscellaneous field probably needs `textarea`, not `text`.

## Template readiness checklist

Before marking a template complete:

- [ ] The full prompt was read.
- [ ] The prompt text was not rewritten or improved.
- [ ] All `{{...}}` variables are extracted.
- [ ] Every prompt variable has exactly one matching form field.
- [ ] No extra form field exists unless documented and approved.
- [ ] Existing variable names are preserved.
- [ ] Template ID and slug are unchanged.
- [ ] Required fields are minimal and justified.
- [ ] Each field has label, type, required/optional, placeholder, and hint.
- [ ] Select fields have clear options.
- [ ] Number fields are used for counts and durations where supported.
- [ ] URL/date fields are represented consistently with current supported types.
- [ ] Defaults are neutral and safe.
- [ ] Conditional fields use `showWhen` only when it improves the form.
- [ ] Every field has `help.what`, `help.why`, `help.example`, and `help.avoid`.
- [ ] A Help page exists for the template.
- [ ] The Help button routes to the matching slug's Help page.
- [ ] The form renders in `/generate?template=<slug>`.
- [ ] Required validation blocks empty required fields.
- [ ] The prompt preview fills variables without unresolved placeholders.
- [ ] No Prisma, auth, Paddle, checkout, webhook, price, `.env`, or migration
      files were changed.

## Reference templates

Use these as the current best examples:

- LinkedIn Post:
  - `prisma/template-prompts/linkedin-post.txt`
  - `src/config/template-forms/linkedin-post-variables.json`
  - `src/app/(protected)/generate/guides/linkedin-post/page.tsx`
- X Thread:
  - `prisma/template-prompts/x-thread.txt`
  - `src/config/template-forms/x-thread-variables.json`
  - `src/app/(protected)/generate/guides/x-thread/page.tsx`
- Blog Article:
  - `prisma/template-prompts/blog-article.txt`
  - `src/config/template-forms/blog-article-variables.json`
  - `src/app/(protected)/generate/guides/blog-article/page.tsx`
- YouTube Script:
  - `prisma/template-prompts/youtube-script.txt`
  - `src/config/template-forms/youtube-script-variables.json`
  - `src/app/(protected)/generate/guides/youtube-script/page.tsx`
- Case Study:
  - `prisma/template-prompts/case-study.txt`
  - `src/config/template-forms/case-study-variables.json`
  - `src/app/(protected)/generate/guides/case-study/page.tsx`

Do not use `facebook-post` or `google-business-profile-post` as UX models
without additional review. They are technically complete, but their forms are
very large and should be reviewed for usability before becoming examples for
future migrations.
