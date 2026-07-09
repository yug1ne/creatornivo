import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  Prisma,
  PrismaClient,
  Plan,
  TemplateCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SeedVariable {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
}

interface SeedTemplate {
  slug: string;
  title: string;
  description: string;
  category: string;
  requiredPlan: string;
  prompt: string;
  variables: SeedVariable[];
}

const catalogPath = path.join(__dirname, "templates-catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as SeedTemplate[];

function toPlan(value: string): Plan {
  return value === "pro" ? Plan.pro : Plan.free;
}

function toCategory(value: string): TemplateCategory {
  const allowed = Object.values(TemplateCategory) as string[];
  if (!allowed.includes(value)) {
    throw new Error(`Unknown TemplateCategory: ${value}`);
  }
  return value as TemplateCategory;
}

async function main() {
  console.log(`Seeding ${catalog.length} templates from catalog...`);

  for (const template of catalog) {
    const data = {
      slug: template.slug,
      title: template.title,
      description: template.description,
      category: toCategory(template.category),
      prompt: template.prompt,
      variables: template.variables as unknown as Prisma.InputJsonValue,
      requiredPlan: toPlan(template.requiredPlan),
      isActive: true,
    };

    await prisma.template.upsert({
      where: { slug: template.slug },
      update: data,
      create: data,
    });
  }

  const free = catalog.filter((t) => t.requiredPlan === "free").length;
  const pro = catalog.filter((t) => t.requiredPlan === "pro").length;
  console.log(`Seeded ${catalog.length} templates (${free} free, ${pro} pro).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
