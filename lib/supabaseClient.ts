/**
 * lib/supabaseClient.ts
 * ---------------------
 * Creates and exports a single Supabase client for use in browser (client) components.
 * Uses createBrowserClient from @supabase/ssr so that sessions are stored in
 * cookies — making them accessible to the server-side middleware as well.
 *
 * Keys come from .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

