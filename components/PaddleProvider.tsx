"use client";

import { useEffect } from "react";
import { initializePaddle } from "@paddle/paddle-js";

export function PaddleProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    void initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      token
    });
  }, []);
  return null;
}
