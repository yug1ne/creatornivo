/**
 * Builds the GitHub README form schema from the approved 32-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-github-readme-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "github-readme.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "github-readme-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Project identity, summary, type, audience, purpose, verified features, repository link, language, depth, and primary reader action.",
    defaultOpen: true,
  },
  {
    id: "setup_usage",
    title: "Setup & Usage",
    description:
      "Technical stack, requirements, installation, package manager, commands, configuration, usage instructions, and examples.",
    defaultOpen: false,
  },
  {
    id: "project_presentation",
    title: "Project Presentation",
    description:
      "Project status, demo and documentation links, badges, media, architecture notes, roadmap, and special requirements.",
    defaultOpen: false,
  },
  {
    id: "community_trust",
    title: "Community & Trust",
    description:
      "Contribution guidance, issue reporting, security disclosure, license, code of conduct, and acknowledgements.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const defaultValues = {
  projectType: "Auto-detect from details",
  primaryAudience: "Developers and users",
  outputLanguage: "English",
  readmeDepth: "Standard",
  primaryCallToAction: "Auto",
  installationMethod: "Auto",
  packageManager: "Auto",
  projectStatus: "Active development",
};

const showWhen = {
  packageManager: {
    key: "installationMethod",
    equals: ["Package manager", "Multiple methods"],
  },
};

const examples = {
  projectName: "TaskFlow CLI",
  projectSummary:
    "A command-line tool that helps small teams organize recurring project tasks from plain-text files.",
  projectType: "Command-line tool",
  primaryAudience: "Developers and users",
  projectPurpose:
    "Use it when a team wants simple local task automation without adopting a hosted project-management system.",
  keyFeatures:
    "Parse task files, group tasks by owner, print due-date summaries, and export a Markdown checklist.",
  repositoryUrl: "https://github.com/example/taskflow-cli",
  outputLanguage: "English",
  readmeDepth: "Standard",
  primaryCallToAction: "Install and try the project",
  techStack: "Node.js, TypeScript, Commander, Vitest",
  systemRequirements: "Node.js 20 or later; pnpm 9 or later.",
  installationMethod: "Package manager",
  packageManager: "pnpm",
  installCommands: "pnpm install\npnpm build",
  usageInstructions: "Run `taskflow scan ./tasks` from the repository root.",
  configurationDetails:
    "Optional `.taskflowrc` file controls default task directory and output format.",
  exampleCode:
    "taskflow scan ./tasks --owner alex --format markdown",
  projectStatus: "Beta",
  demoUrl: "https://www.creatornivo.com/demo",
  documentationUrl: "https://github.com/example/taskflow-cli/docs",
  badgesAndBuildInfo:
    "Only include confirmed build, test, package, or license badges with exact image and target URLs.",
  screenshotsAndMedia:
    "Terminal screenshot showing a sample task summary; hide private project names.",
  architectureNotes:
    "CLI entry point, parser module, reporter module, and file-system adapter.",
  roadmap:
    "Planned: JSON export and custom grouping. Not yet implemented.",
  additionalContext:
    "Do not claim production readiness or security audit; keep commands exact.",
  contributionGuidelines:
    "Open an issue before large changes; run tests before submitting a pull request.",
  issueTrackerUrl: "https://github.com/example/taskflow-cli/issues",
  securityPolicy:
    "Report vulnerabilities privately through the repository security policy.",
  licenseInfo: "MIT",
  codeOfConductUrl: "https://github.com/example/taskflow-cli/blob/main/CODE_OF_CONDUCT.md",
  acknowledgements:
    "Thanks to contributors who tested early task-file formats.",
};

const fieldRows = `
projectName|Project name|Essentials|text|yes|120|Blank|Example: TaskFlow CLI|Enter the public name that should appear at the top of the README.|The project name cannot be safely inferred and is required for the README title.|
projectSummary|Short project description|Essentials|textarea|yes|500|Blank|Describe what the project does in one or two clear sentences.|Focus on the project’s function and main value rather than marketing slogans.|A verified summary is necessary to create an accurate opening description.|
projectType|Project type|Essentials|select|yes|50|Auto-detect from details|Select the closest project type|This changes the README structure, setup instructions, and example format.|Different software project types require meaningfully different installation, usage, and documentation structures.|Auto-detect from details~Library or package~Command-line tool~Web application~API or service~Mobile application~Desktop application~Template or boilerplate~Other software project
primaryAudience|Primary README audience|Essentials|select|yes|50|Developers and users|Choose the main reader|Select the people who should understand and act on the README first.|Audience determines the balance between explanation, setup detail, examples, and contribution information.|Developers and users~Package consumers~Application users~API integrators~Potential contributors~Technical evaluators~Internal development team~Mixed audience
projectPurpose|Purpose and use case|Essentials|textarea|yes|1000|Blank|What problem does the project solve, and when should someone use it?|Include the main use case and any important limits on what the project is for.|The README needs a concrete reason for the project to exist without inventing positioning.|
keyFeatures|Key features|Essentials|textarea|yes|1500|Blank|List the most important verified capabilities, one per line.|Include only features that currently exist or clearly label planned features.|Feature information is project-specific and must be supplied to prevent fabricated capabilities.|
repositoryUrl|Repository URL|Essentials|URL|no|500|Blank|https://github.com/owner/repository|Used only for accurate repository links, clone commands, and references.|An exact URL allows correct repository-specific commands and links without guessing the owner or repository name.|
outputLanguage|README language|Essentials|text|no|60|English|Example: English|Enter the language in which the complete README should be written.|The user may need documentation in a language that cannot be inferred from the project details.|
readmeDepth|README depth|Essentials|select|no|30|Standard|Choose the preferred level of detail|The model will omit unnecessary sections even when a detailed option is selected.|Documentation depth materially changes how much setup, explanation, and example content should be included.|Quick~Standard~Detailed~Auto
primaryCallToAction|Primary reader action|Essentials|select|no|40|Auto|Choose what readers should do next|Select one main action rather than adding several competing requests.|A README should guide readers toward one proportional next step.|Auto~Install and try the project~View the live demo~Read the documentation~Integrate the package or API~Contribute to the project~Star the repository~No explicit call to action
techStack|Technology stack|Setup & Usage|textarea|no|1000|Blank|List languages, frameworks, libraries, runtime, database, or key services.|Include only confirmed technologies used by the project.|Technical stack helps readers understand requirements and project fit.|
systemRequirements|System requirements|Setup & Usage|textarea|no|1500|Blank|List runtime versions, operating systems, tools, accounts, SDKs, databases, or services required.|Do not invent minimum versions or optional tools.|Readers need verified prerequisites before attempting setup.|
installationMethod|Installation method|Setup & Usage|select|no|40|Auto|Select installation style|Choose the supported installation path or let the model infer from supplied commands.|Installation style determines whether the README shows package, clone, Docker, release, hosted, or mixed instructions.|Auto~Package manager~Clone and build~Docker or container~Downloaded release~Hosted with no installation~Multiple methods
packageManager|Package manager|Setup & Usage|select|no|30|Auto|Select package manager|Shown only when package-manager instructions are relevant.|Package-manager syntax must match the actual supported workflow.|Auto~npm~pnpm~Yarn~pip~Poetry~Composer~Cargo~NuGet~Other
installCommands|Installation commands|Setup & Usage|textarea|no|4000|Blank|Paste verified install, clone, build, Docker, or setup commands exactly.|Do not include guessed commands.|Commands are high-risk documentation and must be supplied or clearly marked for verification.|
usageInstructions|Basic usage|Setup & Usage|textarea|no|3000|Blank|Explain the first successful use, command, workflow, or API call.|Keep it focused on a real working path.|Usage instructions turn installation into a practical first result.|
configurationDetails|Configuration and environment|Setup & Usage|textarea|no|4000|Blank|List real environment variables, config files, defaults, and setup notes.|Do not include real secrets or invented variables.|Configuration is often required for a README to be usable.|
exampleCode|Code or command examples|Setup & Usage|textarea|no|4000|Blank|Paste verified code, CLI examples, API calls, or expected workflow examples.|Label illustrative output when it is not exact.|Examples should be accurate enough for readers to adapt safely.|
projectStatus|Project status|Project Presentation|select|no|40|Active development|Select project status|Choose the honest current status.|Status affects whether the README needs beta, archive, maintenance, or stability notices.|Active development~Stable~Beta~Experimental~Maintenance mode~Archived or discontinued
demoUrl|Demo or live project URL|Project Presentation|URL|no|500|Blank|https://www.creatornivo.com/demo|Add only a verified demo, hosted app, preview, or live project URL.|Do not invent a demo link.|Demo links help readers evaluate the project without cloning when a real demo exists.|
documentationUrl|Documentation URL|Project Presentation|URL|no|500|Blank|https://github.com/owner/repository/docs|Add the official docs, wiki, API reference, or website URL.|Use only real documentation destinations.|Documentation links prevent the README from becoming overloaded.|
badgesAndBuildInfo|Badges and build information|Project Presentation|textarea|no|2500|Blank|Paste verified badge image URLs, target URLs, workflow names, package names, or build facts.|Do not invent passing builds, coverage, versions, downloads, stars, or security status.|Badges are useful only when they reflect real repository signals.|
screenshotsAndMedia|Screenshots and media|Project Presentation|textarea|no|2500|Blank|List confirmed screenshots, demo GIFs, diagrams, captions, and privacy notes.|Avoid implying media exists when it does not.|Visuals can make a README clearer when assets are real and safe to publish.|
architectureNotes|Architecture notes|Project Presentation|textarea|no|2500|Blank|Describe repository structure, major modules, services, data flow, or design decisions.|Keep planned architecture separate from implemented architecture.|Architecture context helps technical readers navigate the project.|
roadmap|Roadmap or planned work|Project Presentation|textarea|no|2000|Blank|List planned, experimental, or under-consideration work with status labels.|Do not present planned items as existing features.|Roadmap notes set expectations without overstating current capability.|
additionalContext|Additional context|Project Presentation|textarea|no|2000|Blank|Add special requirements, restrictions, facts to include, or claims to avoid.|Use this for information not already covered by another field.|A final controlled context field handles project-specific edge cases.|
contributionGuidelines|Contribution guidelines|Community & Trust|textarea|no|3000|Blank|Explain who can contribute, how to propose changes, and required checks.|Do not invent contribution acceptance or maintainer availability.|Contribution guidance helps readers participate appropriately.|
issueTrackerUrl|Issue tracker URL|Community & Trust|URL|no|500|Blank|https://github.com/owner/repository/issues|Add the confirmed place to report bugs or request features.|Do not invent support destinations.|Issue links help route feedback without promising response times.|
securityPolicy|Security reporting|Community & Trust|textarea|no|2000|Blank|Explain how vulnerabilities should be reported and what should not be posted publicly.|Do not invent private disclosure methods or audits.|Security reporting needs exact, safe instructions.|
licenseInfo|License information|Community & Trust|text|no|300|Blank|Example: MIT, Apache-2.0, Proprietary, or See LICENSE|State the confirmed license or where to find it.|License information affects whether readers can use, modify, or distribute the project.|
codeOfConductUrl|Code of conduct URL|Community & Trust|URL|no|500|Blank|https://github.com/owner/repository/blob/main/CODE_OF_CONDUCT.md|Add only a confirmed code-of-conduct URL.|Do not imply a policy exists when it does not.|Community policies should be linked accurately.|
acknowledgements|Acknowledgements|Community & Trust|textarea|no|2000|Blank|List libraries, contributors, sponsors, inspirations, or third-party assets to acknowledge.|Use only approved attributions.|Acknowledgements should be accurate and rights-safe.|
`;

function parsePromptVariables(prompt) {
  return [
    ...new Set(
      [...prompt.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

function adaptType(sourceType) {
  if (sourceType === "URL") return { type: "text", format: "url" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (
    [
      "installCommands",
      "usageInstructions",
      "configurationDetails",
      "exampleCode",
    ].includes(field.key)
  ) {
    return "Avoid guessed commands, fake package names, invented environment variables, real secrets, unsupported outputs, or unverified setup steps.";
  }
  if (
    [
      "repositoryUrl",
      "demoUrl",
      "documentationUrl",
      "issueTrackerUrl",
      "codeOfConductUrl",
    ].includes(field.key)
  ) {
    return "Avoid invented, private, shortened, misleading, or unrelated URLs.";
  }
  if (
    [
      "badgesAndBuildInfo",
      "screenshotsAndMedia",
      "securityPolicy",
      "licenseInfo",
      "acknowledgements",
    ].includes(field.key)
  ) {
    return "Avoid invented badges, audits, licenses, contributors, media assets, acknowledgements, or trust claims.";
  }
  if (field.required) {
    return "Avoid vague placeholders, marketing slogans, unsupported capabilities, fake status claims, or changing the project into a different tool.";
  }
  return "Avoid guessed technical details, unsupported compatibility, fake roadmap promises, secrets, or undocumented behavior.";
}

function buildField(row) {
  const [
    key,
    label,
    groupTitle,
    sourceType,
    requiredRaw,
    maxLengthRaw,
    defaultRaw,
    placeholder,
    baseHint,
    why,
    rawOptions = "",
  ] = row.split("|");

  const required = requiredRaw === "yes";
  const adapted = adaptType(sourceType);
  const options =
    adapted.type === "select" && rawOptions ? rawOptions.split("~") : undefined;
  const maxLength = Number(maxLengthRaw);
  const defaultValue =
    defaultRaw !== "Blank" && defaultValues[key] ? defaultValues[key] : undefined;

  const field = {
    key,
    label,
    group: groupIdsByTitle[groupTitle],
    groupTitle,
    type: adapted.type,
    required,
    placeholder,
    hint: baseHint,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} before generating the GitHub README.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (adapted.format) field.format = adapted.format;
  if (defaultValue) field.defaultValue = defaultValue;
  if (options) field.options = options;
  if (Number.isFinite(maxLength) && maxLength > 0) field.maxLength = maxLength;
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (sourceType === "textarea" || maxLength > 500) field.fullWidth = true;

  return field;
}

const variables = fieldRows
  .trim()
  .split("\n")
  .map((line) => buildField(line.trim()));

const prompt = fs.readFileSync(promptPath, "utf8");
const promptVariables = parsePromptVariables(prompt);
const formKeys = variables.map((variable) => variable.key);
const missingFromForm = promptVariables.filter((key) => !formKeys.includes(key));
const extraInForm = formKeys.filter((key) => !promptVariables.includes(key));

if (missingFromForm.length || extraInForm.length) {
  throw new Error(
    [
      missingFromForm.length
        ? `Missing form fields: ${missingFromForm.join(", ")}`
        : "",
      extraInForm.length ? `Extra form fields: ${extraInForm.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

const schema = {
  slug: "github-readme",
  title: "GitHub README",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`);
