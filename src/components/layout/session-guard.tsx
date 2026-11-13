"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export const SESSION_KEY = "bo-session";
const IDLE_LIMIT_MS = 15 * 60 * 1000; // BRD 15.3: 15 minutes of inactivity
const MAX_SESSION_MS = 8 * 60 * 60 * 1000; // or 8 hours from sign-in
const WARN_BEFORE_MS = 60 * 1000;

/**
 * Client-side stand-in for the real session check (GET /auth/session).
 * Sends unsigned visitors to sign-in, warns one minute before the idle limit, then signs out.
 * The server must enforce the same limits; this only keeps the screen honest.
 */
export function SessionGuard() {
  const router = useRouter();
  const lastActive = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const startedAt = Number(sessionStorage.getItem(SESSION_KEY));
    if (!startedAt) {
      router.replace("/login");
      return;
    }
    lastActive.current = Date.now();
    const touch = () => { lastActive.current = Date.now(); };
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const tick = setInterval(() => {
      const now = Date.now();
      const idleLeft = IDLE_LIMIT_MS - (now - lastActive.current);
      const sessionLeft = MAX_SESSION_MS - (now - startedAt);
      const left = Math.min(idleLeft, sessionLeft);
      if (left <= 0) {
        sessionStorage.removeItem(SESSION_KEY);
        router.replace("/login?reason=timeout");
      } else {
        setSecondsLeft(left <= WARN_BEFORE_MS ? Math.ceil(left / 1000) : null);
      }
    }, 1000);

    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [router]);

  return (
    <Modal
      open={secondsLeft !== null}
      onClose={() => { lastActive.current = Date.now(); setSecondsLeft(null); }}
      size="sm"
      title="You are about to be signed out"
      description="Sessions end after 15 minutes without activity."
      footer={<Button onClick={() => { lastActive.current = Date.now(); setSecondsLeft(null); }}>Stay signed in</Button>}
    >
      <p className="py-2 text-sm text-ink-700">Signing out in <span className="font-semibold tabular">{secondsLeft}</span> seconds. Unsaved entries on this screen will be lost.</p>
    </Modal>
  );
}
