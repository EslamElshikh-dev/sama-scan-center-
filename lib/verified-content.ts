import "server-only";
import { cache } from "react";
import type { PublicContent } from "./growth";

// Low-privilege public RPC exposes approved display fields only.
export const getVerifiedContent = cache(async (): Promise<PublicContent[]> => {
  try {
    const response = await fetch("https://vddoeiggfcwllfxpirep.supabase.co/rest/v1/rpc/samascan_public_content", {
      method: "POST", headers: { "Content-Type": "application/json", apikey: "sb_publishable_ZpjxAzWkEPl2jfJg17iRVg_XYdIs2pO" },
      body: "{}", next: { revalidate: 300 }, signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? data.filter((item): item is PublicContent => Boolean(item && typeof item.id === "string" && ["service", "clinician", "review"].includes(item.kind) && typeof item.data === "object")) : [];
  } catch { return []; }
});
