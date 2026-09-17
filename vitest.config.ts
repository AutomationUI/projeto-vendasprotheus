import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: {
      VITE_SUPABASE_URL: "https://mock.supabase.co",
      VITE_SUPABASE_ANON_KEY: "mock-anon-key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/hooks/**", "src/lib/**"],
      exclude: ["src/lib/mock-data.ts", "src/lib/mock-production.ts"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
