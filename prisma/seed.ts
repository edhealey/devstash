import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ============================================
// SYSTEM ITEM TYPES
// ============================================
const systemItemTypes = [
  { name: "snippet", icon: "Code", color: "#3b82f6", isSystem: true },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6", isSystem: true },
  { name: "command", icon: "Terminal", color: "#f97316", isSystem: true },
  { name: "note", icon: "StickyNote", color: "#fde047", isSystem: true },
  { name: "file", icon: "File", color: "#6b7280", isSystem: true },
  { name: "image", icon: "Image", color: "#ec4899", isSystem: true },
  { name: "link", icon: "Link", color: "#10b981", isSystem: true },
];

async function seedSystemItemTypes() {
  console.log("Seeding system item types...");

  // System types have a null userId, so the [name, userId] unique constraint
  // can't be used for a clean upsert (NULLs are distinct in Postgres).
  // Find-then-create keeps the seed idempotent.
  for (const type of systemItemTypes) {
    const existing = await prisma.itemType.findFirst({
      where: { name: type.name, isSystem: true },
    });

    if (!existing) {
      await prisma.itemType.create({ data: type });
    }
  }

  // Return a name -> id map for wiring items to their type.
  const types = await prisma.itemType.findMany({ where: { isSystem: true } });
  return new Map(types.map((t) => [t.name, t.id]));
}

// ============================================
// DEMO USER
// ============================================
async function seedDemoUser() {
  console.log("Seeding demo user...");

  const password = await bcrypt.hash("12345678", 12);

  return prisma.user.upsert({
    where: { email: "demo@devstash.io" },
    update: { name: "Demo User", password, isPro: false, emailVerified: new Date() },
    create: {
      email: "demo@devstash.io",
      name: "Demo User",
      password,
      isPro: false,
      emailVerified: new Date(),
    },
  });
}

// ============================================
// COLLECTIONS & ITEMS
// ============================================
type SeedItem = {
  title: string;
  type: string;
  description?: string;
  content?: string;
  url?: string;
  language?: string;
  isPinned?: boolean;
};

type SeedCollection = {
  name: string;
  description: string;
  isFavorite?: boolean;
  items: SeedItem[];
};

const collections: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Reusable React patterns and hooks",
    isFavorite: true,
    items: [
      {
        title: "useDebounce hook",
        type: "snippet",
        language: "typescript",
        isPinned: true,
        description: "Debounce a rapidly-changing value, e.g. a search input.",
        content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}`,
      },
      {
        title: "Theme context provider",
        type: "snippet",
        language: "typescript",
        description: "A compound Context provider + hook pattern for theming.",
        content: `import { createContext, useContext, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}`,
      },
      {
        title: "cn() className utility",
        type: "snippet",
        language: "typescript",
        description: "Merge conditional Tailwind classes without conflicts.",
        content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      },
    ],
  },
  {
    name: "AI Workflows",
    description: "AI prompts and workflow automations",
    isFavorite: true,
    items: [
      {
        title: "Code review prompt",
        type: "prompt",
        isPinned: true,
        description: "Ask an LLM for a focused, actionable code review.",
        content: `You are a senior engineer doing a code review. Review the diff below for:
1. Correctness and edge cases
2. Security (input validation, auth, injection)
3. Performance (N+1 queries, unnecessary re-renders)
4. Readability and naming

For each issue give the severity, the file/line, and a concrete fix. Be concise
and skip nitpicks unless they affect maintainability.

DIFF:
"""
{{diff}}
"""`,
      },
      {
        title: "Generate docstrings",
        type: "prompt",
        description: "Produce documentation for a function or module.",
        content: `Write clear documentation for the following code. Include a one-line summary,
a longer description, parameters with types, the return value, thrown errors,
and a short usage example. Match the language's conventional doc format
(JSDoc/TSDoc for JS/TS, Google style for Python).

CODE:
"""
{{code}}
"""`,
      },
      {
        title: "Refactor assistant",
        type: "prompt",
        description: "Refactor code without changing behavior.",
        content: `Refactor the code below to improve readability and reduce duplication WITHOUT
changing its observable behavior. Explain each change in one line. Preserve the
public API and existing tests. If a change is risky, flag it instead of applying it.

CODE:
"""
{{code}}
"""`,
      },
    ],
  },
  {
    name: "DevOps",
    description: "Infrastructure and deployment resources",
    items: [
      {
        title: "Multi-stage Node Dockerfile",
        type: "snippet",
        language: "dockerfile",
        description: "Slim production image for a Node.js app.",
        content: `# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]`,
      },
      {
        title: "Deploy to production",
        type: "command",
        language: "bash",
        description: "Run migrations then start the app on deploy.",
        content: "npx prisma migrate deploy && npm run build && npm run start",
      },
      {
        title: "Docker Documentation",
        type: "link",
        description: "Official Docker reference and guides.",
        url: "https://docs.docker.com/",
      },
      {
        title: "GitHub Actions Documentation",
        type: "link",
        description: "CI/CD workflows and syntax reference.",
        url: "https://docs.github.com/en/actions",
      },
    ],
  },
  {
    name: "Terminal Commands",
    description: "Useful shell commands for everyday development",
    items: [
      {
        title: "Undo last commit (keep changes)",
        type: "command",
        language: "bash",
        isPinned: true,
        description: "Soft-reset the last commit, leaving files staged.",
        content: "git reset --soft HEAD~1",
      },
      {
        title: "Remove all stopped containers",
        type: "command",
        language: "bash",
        description: "Prune stopped Docker containers.",
        content: "docker container prune -f",
      },
      {
        title: "Kill process on a port",
        type: "command",
        language: "bash",
        description: "Find and kill whatever is listening on port 3000.",
        content: "lsof -ti:3000 | xargs kill -9",
      },
      {
        title: "Clean npm reinstall",
        type: "command",
        language: "bash",
        description: "Wipe node_modules and lockfile-install fresh.",
        content: "rm -rf node_modules package-lock.json && npm install",
      },
    ],
  },
  {
    name: "Design Resources",
    description: "UI/UX resources and references",
    items: [
      {
        title: "Tailwind CSS Docs",
        type: "link",
        description: "Utility-first CSS framework reference.",
        url: "https://tailwindcss.com/docs",
      },
      {
        title: "shadcn/ui",
        type: "link",
        description: "Accessible, composable React component library.",
        url: "https://ui.shadcn.com",
      },
      {
        title: "Material Design 3",
        type: "link",
        description: "Google's design system guidelines.",
        url: "https://m3.material.io/",
      },
      {
        title: "Lucide Icons",
        type: "link",
        description: "Open-source icon library used across the app.",
        url: "https://lucide.dev/icons/",
      },
    ],
  },
];

const CONTENT_TYPE_BY_ITEM_TYPE: Record<string, "TEXT" | "FILE" | "URL"> = {
  snippet: "TEXT",
  prompt: "TEXT",
  command: "TEXT",
  note: "TEXT",
  link: "URL",
  file: "FILE",
  image: "FILE",
};

async function seedCollectionsAndItems(
  userId: string,
  typeIds: Map<string, string>,
) {
  console.log("Seeding collections and items...");

  // Idempotent: clear the demo user's existing collections and items first.
  // ItemCollection rows are removed via cascade deletes.
  await prisma.item.deleteMany({ where: { userId } });
  await prisma.collection.deleteMany({ where: { userId } });

  for (const col of collections) {
    const collection = await prisma.collection.create({
      data: {
        name: col.name,
        description: col.description,
        isFavorite: col.isFavorite ?? false,
        userId,
      },
    });

    for (const item of col.items) {
      const itemTypeId = typeIds.get(item.type);
      if (!itemTypeId) {
        throw new Error(`Unknown item type: ${item.type}`);
      }

      await prisma.item.create({
        data: {
          title: item.title,
          contentType: CONTENT_TYPE_BY_ITEM_TYPE[item.type],
          content: item.content ?? null,
          url: item.url ?? null,
          description: item.description ?? null,
          language: item.language ?? null,
          isPinned: item.isPinned ?? false,
          userId,
          itemTypeId,
          collections: { create: { collectionId: collection.id } },
        },
      });
    }
  }
}

async function main() {
  const typeIds = await seedSystemItemTypes();
  const user = await seedDemoUser();
  await seedCollectionsAndItems(user.id, typeIds);

  const [collectionCount, itemCount] = await Promise.all([
    prisma.collection.count({ where: { userId: user.id } }),
    prisma.item.count({ where: { userId: user.id } }),
  ]);

  console.log(
    `Seeding complete! ${collectionCount} collections, ${itemCount} items for ${user.email}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
