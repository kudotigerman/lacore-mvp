import type { SupabaseClient } from "@supabase/supabase-js";
import { CREDIT_COSTS, type CreditAction } from "./dodo-config";

export async function checkCredits(
  client: SupabaseClient,
  userId: string,
  action: CreditAction
): Promise<boolean> {
  const cost = CREDIT_COSTS[action];
  const { data } = await client.from("profiles").select("credits_balance").eq("user_id", userId).maybeSingle();
  const row = data as { credits_balance?: number } | null;
  return (row?.credits_balance ?? 0) >= cost;
}

export async function deductCredits(
  client: SupabaseClient,
  userId: string,
  action: CreditAction
): Promise<boolean> {
  const cost = CREDIT_COSTS[action];
  const { data, error } = await client.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: cost,
    p_action: action
  });
  return !error && data === true;
}

export async function addCredits(
  client: SupabaseClient,
  userId: string,
  amount: number,
  action: string
): Promise<void> {
  const { error } = await client.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_action: action
  });
  if (error) {
    console.error("addCredits rpc error:", error.message);
  }
}

export async function getCreditsBalance(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client.from("profiles").select("credits_balance").eq("user_id", userId).maybeSingle();
  const row = data as { credits_balance?: number } | null;
  return row?.credits_balance ?? 0;
}
