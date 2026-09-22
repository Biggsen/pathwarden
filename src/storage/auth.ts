import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await getSupabase().auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Sign in required");
  return user.id;
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await getSupabase().auth.getUser();
  if (error) throw error;
  return user;
}
