import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          env.SUPABASE_PUBLISHABLE_KEY ||
          env.SUPABASE_ANON_KEY ||
          "",
      ),
    },
  };
});
