"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { signOut } from "@/lib/bo/session-client";

const IDLE_LIMIT_MS = 15 * 60 * 1000; // BRD 15.3: 15 minutes of inactivity
const MAX_SESSION_MS = 8 * 60 * 60 * 1000; // or 8 hours from sign-in
const WARN_BEFORE_MS = 60 * 1000;
const CHECK_EVERY_MS = 60 * 1000;

export { signOut };

/**
 * Keeps the screen honest about the real session:
 *  - asks the server once a minute whether the session is still valid (this also renews the short-lived token)
 *  - warns one minute before the 15-minute idle limit, then signs out
 *  - ends the session at the 8-hour limit
 * The back end enforces its own expiry; this only makes sure the screen follows it.
 */
export function SessionGuard() {
  const router = useRouter();
  const lastActive = useRef(0);
  const startedAt = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    lastActive.current = Date.now();
    let stopped = false;

    const check = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (stopped) return;
        if (res.status === 401) return void signOut("expired");
        const data = (await res.json()) as { startedAt?: number | null };
        if (data.startedAt) startedAt.current = data.startedAt;
      } catch {
        // A network blip is not a sign-out. The next check will try again.
      }
    };
    void check();
    const poll = setInterval(check, CHECK_EVERY_MS);

    const touch = () => { lastActive.current = Date.now(); };
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const tick = setInterval(() => {
      const now = Date.now();
      const idleLeft = IDLE_LIMIT_MS - (now - lastActive.current);
      const sessionLeft = startedAt.current ? MAX_SESSION_MS - (now - startedAt.current) : Infinity;
      const left = Math.min(idleLeft, sessionLeft);
      if (left <= 0) {
        stopped = true;
        void signOut("timeout");
      } else {
        setSecondsLeft(left <= WARN_BEFORE_MS ? Math.ceil(left / 1000) : null);
      }
    }, 1000);

    return () => {
      stopped = true;
      clearInterval(poll);
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [router]);

  const stay = () => { lastActive.current = Date.now(); setSecondsLeft(null); };

  return (
    <Modal
      open={secondsLeft !== null}
      onClose={stay}
      size="sm"
      title="You are about to be signed out"
      description="Sessions end after 15 minutes without activity."
      footer={<Button onClick={stay}>Stay signed in</Button>}
    >
      <p className="py-2 text-sm text-ink-700">Signing out in <span className="font-semibold tabular">{secondsLeft}</span> seconds. Unsaved entries on this screen will be lost.</p>
    </Modal>
  );
}
