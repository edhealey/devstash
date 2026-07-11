// Mock data for the dashboard UI.
// Only the current user remains mocked until NextAuth is wired up; item types,
// collections, and items now come from the database.

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isPro: boolean;
}

export const currentUser: User = {
  id: "user_1",
  name: "John Doe",
  email: "demo@devstash.io",
  avatarUrl: null,
  isPro: true,
};
