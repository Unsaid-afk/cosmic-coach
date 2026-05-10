import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";

interface UserData {
  id: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  isPremium: boolean;
}

interface ProductRow {
  price_id: string;
  unit_amount: number;
}

async function fetchMe(): Promise<UserData> {
  const resp = await fetch("/api/users/me", { credentials: "include" });
  if (!resp.ok) throw new Error("Failed to fetch user");
  return resp.json() as Promise<UserData>;
}

async function fetchPriceId(): Promise<string | null> {
  try {
    const resp = await fetch("/api/billing/products", { credentials: "include" });
    if (!resp.ok) return null;
    const data = await resp.json() as { data: ProductRow[] };
    const rows = data.data ?? [];
    if (rows.length === 0) return null;
    const sorted = rows.filter((r) => r.price_id).sort((a, b) => a.unit_amount - b.unit_amount);
    return sorted[0]?.price_id ?? null;
  } catch {
    return null;
  }
}

export function usePremiumStatus() {
  const { isSignedIn } = useUser();

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: fetchMe,
    enabled: !!isSignedIn,
    staleTime: 30_000,
    retry: false,
  });

  const { data: priceId } = useQuery({
    queryKey: ["billing-products"],
    queryFn: fetchPriceId,
    staleTime: 300_000,
    retry: false,
  });

  return {
    isPremium: user?.isPremium ?? false,
    isLoading: isUserLoading,
    user,
    priceId: priceId ?? null,
  };
}
