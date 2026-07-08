// Mock data for the dashboard UI.
// Single source of truth until the database is wired up.

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isPro: boolean;
}

export interface ItemType {
  id: string;
  name: string;
  // lucide-react icon name used to render the type
  icon: string;
  // tailwind text color class for the icon
  color: string;
  count: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  isFavorite: boolean;
  // tailwind color used for the card's accent border
  accentColor: string;
  // ItemType ids represented inside the collection
  typeIds: string[];
}

export interface Item {
  id: string;
  title: string;
  description: string;
  typeId: string;
  collectionId: string | null;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: string;
}

export const currentUser: User = {
  id: "user_1",
  name: "John Doe",
  email: "demo@devstash.io",
  avatarUrl: null,
  isPro: true,
};

export const itemTypes: ItemType[] = [
  { id: "type_snippet", name: "Snippets", icon: "Code2", color: "text-blue-400", count: 24 },
  { id: "type_prompt", name: "Prompts", icon: "Sparkles", color: "text-purple-400", count: 18 },
  { id: "type_command", name: "Commands", icon: "TerminalSquare", color: "text-orange-400", count: 15 },
  { id: "type_note", name: "Notes", icon: "FileText", color: "text-yellow-400", count: 12 },
  { id: "type_file", name: "Files", icon: "File", color: "text-neutral-300", count: 5 },
  { id: "type_image", name: "Images", icon: "Image", color: "text-pink-400", count: 3 },
  { id: "type_url", name: "Links", icon: "Link2", color: "text-green-400", count: 8 },
];

export const collections: Collection[] = [
  {
    id: "col_react",
    name: "React Patterns",
    description: "Common React patterns and hooks",
    itemCount: 12,
    isFavorite: true,
    accentColor: "border-l-blue-500",
    typeIds: ["type_snippet", "type_note", "type_url"],
  },
  {
    id: "col_python",
    name: "Python Snippets",
    description: "Useful Python code snippets",
    itemCount: 8,
    isFavorite: false,
    accentColor: "border-l-blue-500",
    typeIds: ["type_snippet", "type_note"],
  },
  {
    id: "col_context",
    name: "Context Files",
    description: "AI context files for projects",
    itemCount: 5,
    isFavorite: true,
    accentColor: "border-l-neutral-600",
    typeIds: ["type_file", "type_note"],
  },
  {
    id: "col_interview",
    name: "Interview Prep",
    description: "Technical interview preparation",
    itemCount: 24,
    isFavorite: false,
    accentColor: "border-l-yellow-500",
    typeIds: ["type_note", "type_snippet", "type_url", "type_prompt"],
  },
  {
    id: "col_git",
    name: "Git Commands",
    description: "Frequently used git commands",
    itemCount: 15,
    isFavorite: true,
    accentColor: "border-l-orange-500",
    typeIds: ["type_command", "type_note"],
  },
  {
    id: "col_ai_prompts",
    name: "AI Prompts",
    description: "Curated AI prompts for coding",
    itemCount: 18,
    isFavorite: false,
    accentColor: "border-l-purple-500",
    typeIds: ["type_prompt", "type_snippet", "type_note"],
  },
];

export const items: Item[] = [
  {
    id: "item_use_auth",
    title: "useAuth Hook",
    description: "Custom authentication hook for React applications",
    typeId: "type_snippet",
    collectionId: "col_react",
    tags: ["react", "auth", "hooks"],
    isFavorite: true,
    isPinned: true,
    updatedAt: "2026-01-15",
  },
  {
    id: "item_api_error",
    title: "API Error Handling Pattern",
    description: "Fetch wrapper with exponential backoff retry logic",
    typeId: "type_snippet",
    collectionId: "col_react",
    tags: ["fetch", "error-handling", "typescript"],
    isFavorite: false,
    isPinned: true,
    updatedAt: "2026-01-12",
  },
  {
    id: "item_rebase_prompt",
    title: "Interactive Rebase Cheatsheet",
    description: "Squash, reorder and fixup commits with git rebase",
    typeId: "type_command",
    collectionId: "col_git",
    tags: ["git", "rebase"],
    isFavorite: true,
    isPinned: false,
    updatedAt: "2026-01-10",
  },
  {
    id: "item_refactor_prompt",
    title: "Refactor to Clean Code",
    description: "Prompt that refactors code for readability and testability",
    typeId: "type_prompt",
    collectionId: "col_ai_prompts",
    tags: ["ai", "refactor", "prompt"],
    isFavorite: false,
    isPinned: false,
    updatedAt: "2026-01-08",
  },
  {
    id: "item_py_decorator",
    title: "Timing Decorator",
    description: "Measure execution time of any Python function",
    typeId: "type_snippet",
    collectionId: "col_python",
    tags: ["python", "decorator"],
    isFavorite: false,
    isPinned: false,
    updatedAt: "2026-01-05",
  },
  {
    id: "item_project_context",
    title: "Project Context Template",
    description: "Reusable context file for AI coding assistants",
    typeId: "type_file",
    collectionId: "col_context",
    tags: ["ai", "context", "template"],
    isFavorite: true,
    isPinned: false,
    updatedAt: "2026-01-03",
  },
];
