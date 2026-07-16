import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function todayStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function escapeCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

export function writeSmokeReports(report) {
  const dir = path.join(process.cwd(), "smoke-reports");
  mkdirSync(dir, { recursive: true });
  const stamp = todayStamp(new Date(report.generatedAt));
  const jsonPath = path.join(dir, `template-smoke-${stamp}.json`);
  const mdPath = path.join(dir, `template-smoke-${stamp}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    `# Template smoke report — ${stamp}`,
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Mode: **${report.mode}**`,
    `- Smoke goal: **${report.smokeGoal ?? "normal"}**`,
    `- Base URL: ${report.baseUrl}`,
    `- Templates: ${report.templates.join(", ")}`,
    `- Stopped early: ${report.stoppedEarly ? `yes (${report.stopReason})` : "no"}`,
    "",
    "## Summary table",
    "",
    "| template | status | goal ok | quota before | quota after | req filled | fields filled/skipped | generate enabled | forbidden | notes |",
    "|---|---|---|---:|---:|---:|---|---|---|---|",
  ];

  for (const row of report.results) {
    const forbidden = row.forbiddenPhraseDetected
      ? `yes (${row.matchedPhrase ?? ""})`
      : "no";
    const req =
      row.requiredFieldsFilled != null && row.requiredKeys
        ? `${row.requiredFieldsFilled}/${row.requiredKeys.length}`
        : row.requiredFieldsFilled != null
          ? String(row.requiredFieldsFilled)
          : "n/a";
    const fillSkip = `${row.fieldsFilled ?? "?"} filled / ${row.fieldsSkipped ?? "?"} skipped`;
    const gen =
      row.generateButtonEnabled === true
        ? "yes"
        : row.generateButtonEnabled === false
          ? "no"
          : "n/a";
    const goalOk =
      row.smokeGoalSuccess === true
        ? "yes"
        : row.smokeGoalSuccess === false
          ? "no"
          : "n/a";

    const requested =
      row.requestedTemplate ?? row.template ?? "";
    const canonical =
      row.canonicalTemplate ?? row.canonicalSlug ?? requested;
    const aliasApplied =
      row.aliasApplied === true ||
      row.aliased === true ||
      (canonical && requested && canonical !== requested);
    const templateCell = aliasApplied
      ? `${requested} → ${canonical}`
      : requested;
    lines.push(
      `| ${escapeCell(templateCell)} | ${escapeCell(row.status)} | ${escapeCell(goalOk)} | ${escapeCell(row.quotaBeforeLabel)} | ${escapeCell(row.quotaAfterLabel)} | ${escapeCell(req)} | ${escapeCell(fillSkip)} | ${escapeCell(gen)} | ${escapeCell(forbidden)} | ${escapeCell(row.notes)} |`,
    );
  }

  lines.push("", "## Details", "");

  for (const row of report.results) {
    const requested =
      row.requestedTemplate ?? row.template ?? "";
    const canonical =
      row.canonicalTemplate ?? row.canonicalSlug ?? requested;
    const aliasApplied =
      row.aliasApplied === true ||
      row.aliased === true ||
      (canonical && requested && canonical !== requested);

    lines.push(`### ${requested || row.template}`);
    lines.push("");
    lines.push(`- Status: **${row.status}**`);
    lines.push(`- requestedTemplate: \`${requested || "—"}\``);
    lines.push(`- canonicalTemplate: \`${canonical || "—"}\``);
    lines.push(`- aliasApplied: ${aliasApplied ? "true" : "false"}`);
    if (aliasApplied) {
      lines.push(
        `- Alias: \`${requested}\` → \`${canonical}\``,
      );
    }
    lines.push(`- Smoke goal: ${row.smokeGoal ?? report.smokeGoal ?? "normal"}`);
    lines.push(
      `- Goal success: ${row.smokeGoalSuccess === true ? "yes" : row.smokeGoalSuccess === false ? "no" : "n/a"}`,
    );
    lines.push(`- Selected template title: ${row.selectedTemplateTitle ?? row.title ?? "—"}`);
    lines.push(`- Restriction field: ${row.restrictionField ?? "none"}`);
    lines.push(
      `- Fields filled: ${row.fieldsFilled ?? "n/a"}; required filled: ${row.requiredFieldsFilled ?? "n/a"}${row.requiredKeys ? ` / ${row.requiredKeys.length}` : ""}; skipped: ${row.fieldsSkipped ?? "n/a"}`,
    );
    if (row.skippedKeys?.length) {
      lines.push(`- Skipped keys: \`${row.skippedKeys.join("`, `")}\``);
    }
    if (row.missingRequired?.length) {
      lines.push(`- Missing required: \`${row.missingRequired.join("`, `")}\``);
    }
    lines.push(
      `- Generate button enabled (pre-click): ${row.generateButtonEnabled === true ? "yes" : row.generateButtonEnabled === false ? "no" : "n/a"}`,
    );
    if (row.generateButtonLabelAfter != null || row.generateButtonEnabledAfter != null) {
      lines.push(
        `- Generate button after: label="${row.generateButtonLabelAfter ?? "?"}" enabled=${row.generateButtonEnabledAfter}`,
      );
    }
    if (row.stillGenerating != null) {
      lines.push(`- Still generating: ${row.stillGenerating}`);
    }
    if (row.generationElapsedMs != null) {
      lines.push(`- Generation elapsed ms: ${row.generationElapsedMs}`);
    }
    if (row.lastAction) {
      lines.push(`- Last action: ${row.lastAction}`);
    }
    if (row.scrapeHow) {
      lines.push(`- Result scrape: ${row.scrapeHow}`);
    }
    if (row.contentOnlyLength != null) {
      lines.push(`- Body chars (after chrome strip): ${row.contentOnlyLength}`);
    }
    if (row.api) {
      lines.push(
        `- API /api/ai/generate: started=${row.api.requestStarted} finished=${row.api.requestFinished} failed=${row.api.failed} status=${row.api.status ?? "n/a"} networkError=${row.api.networkError ?? false}`,
      );
      if (row.api.failureText) {
        lines.push(`- API failure: ${row.api.failureText}`);
      }
      if (row.api.bodyExcerpt) {
        lines.push(`- API body excerpt: ${String(row.api.bodyExcerpt).slice(0, 300)}`);
      }
    }
    if (row.consoleErrors?.length) {
      lines.push("- Console errors:");
      for (const e of row.consoleErrors.slice(0, 5)) {
        lines.push(`  - ${e}`);
      }
    }
    if (row.pageErrors?.length) {
      lines.push("- Page errors:");
      for (const e of row.pageErrors.slice(0, 5)) {
        lines.push(`  - ${e}`);
      }
    }
    if (row.screenshotPath) {
      lines.push(`- Screenshot: ${row.screenshotPath}`);
    }
    lines.push(
      `- Quota: ${row.quotaBeforeLabel ?? "?"} → ${row.quotaAfterLabel ?? "?"}`,
    );
    if (row.warnings?.length) {
      lines.push("- Warnings:");
      for (const w of row.warnings) {
        const msg = typeof w === "string" ? w : w.message ?? JSON.stringify(w);
        const key = typeof w === "object" && w.key ? ` (${w.key})` : "";
        lines.push(`  - ${msg}${key}`);
      }
    }
    if (row.filledDetails?.length) {
      lines.push("- Filled controls:");
      for (const f of row.filledDetails) {
        const sel =
          f.kind === "select"
            ? ` → selected value="${f.selectedValue ?? ""}" label="${f.selectedLabel ?? ""}"`
            : "";
        lines.push(
          `  - \`${f.key}\` (${f.kind ?? "?"}${f.isRestriction ? ", restriction" : ""})${sel}`,
        );
      }
    }
    if (row.skippedDetails?.length) {
      lines.push("- Skipped details:");
      for (const s of row.skippedDetails) {
        lines.push(
          `  - \`${s.key}\`: ${s.reason ?? "skipped"}${s.required ? " [required]" : ""}${s.isRestriction ? " [restriction]" : ""}`,
        );
      }
    }
    lines.push(`- Error: ${row.errorMessage || "—"}`);
    lines.push(`- Notes: ${row.notes || "—"}`);
    lines.push(`- Excerpt:`);
    lines.push("");
    lines.push("```");
    lines.push((row.outputExcerpt || "").slice(0, 1200) || "(empty)");
    lines.push("```");
    lines.push("");
  }

  writeFileSync(mdPath, `${lines.join("\n")}\n`);

  return { jsonPath, mdPath };
}
