"use client";

import { useEffect } from "react";
import { initializePaddle } from "@paddle/paddle-js";
import { paddleInitOptions } from "@/lib/paddle-client";

export function PaddleProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    void initializePaddle(
      paddleInitOptions(
        token,
        process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox"
      )
    );
  }, []);
  return null;
}
