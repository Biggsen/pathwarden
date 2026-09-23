import { getSupabase } from "./supabase";
import { requireUserId } from "./auth";

export interface AccountProfile {
  displayName: string;
  email: string;
}

function fallbackName(email: string, metadataName: unknown): string {
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }
  const local = email.split("@")[0]?.trim();
  return local || "";
}

export const profileStore = {
  async read(): Promise<AccountProfile> {
    const userId = await requireUserId();
    const db = getSupabase();
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError) throw userError;
    const email = userData.user?.email ?? "";
    const { data, error } = await db
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    const stored =
      typeof data?.display_name === "string" ? data.display_name.trim() : "";
    return {
      displayName:
        stored || fallbackName(email, userData.user?.user_metadata?.display_name),
      email,
    };
  },

  async updateDisplayName(displayName: string): Promise<string> {
    const name = displayName.trim();
    if (!name) throw new Error("Enter a name");
    const userId = await requireUserId();
    const db = getSupabase();
    const { error } = await db
      .from("profiles")
      .update({
        display_name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw error;
    const { error: authError } = await db.auth.updateUser({
      data: { display_name: name },
    });
    if (authError) throw authError;
    return name;
  },
};
