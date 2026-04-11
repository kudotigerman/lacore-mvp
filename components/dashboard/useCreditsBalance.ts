"use client";

import { useEffect, useState } from "react";

export function useCreditsBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/credits/balance", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data: { credits_balance?: unknown }) => {
        setBalance(typeof data.credits_balance === "number" ? data.credits_balance : 0);
      })
      .catch(() => setBalance(0));
  }, []);

  return balance;
}
