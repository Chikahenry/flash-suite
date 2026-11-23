import Image from "next/image";
import { Suspense } from "react";
import { Brand } from "@/components/layout/brand";

// Figma "Login" frame (1440x1024): navy frame, the Bank banner on the left (large screens), a white card 760px wide inset 8px on the right
// with 24px corners, a 488px form centred in it, and the copyright line near the bottom.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen gap-2 bg-brand-800 bg-[linear-gradient(135deg,transparent_0%,rgb(255_255_255/0.03)_50%,transparent_100%)] p-2">
      <div className="relative hidden flex-1 overflow-hidden rounded-3xl lg:block">
        <Image src="/login-banner.jpg" alt="Fidelity Bank: your next FX transfer can start here" fill priority sizes="(min-width: 1024px) 50vw, 0px" className="object-cover object-top" />
      </div>
      <div className="relative flex w-full max-w-[760px] lg:shrink-0 lg:basis-[760px] flex-col items-center justify-center rounded-3xl bg-white px-6 py-24">
        <div className="w-full max-w-[488px]">
          <Brand tone="dark" className="mx-auto mb-[34px] h-8" />
          <Suspense>{children}</Suspense>
        </div>
        <p className="absolute inset-x-0 bottom-[84px] text-center text-sm text-ink-700">© 2026 Fidelity Bank. All rights reserved.</p>
      </div>
    </div>
  );
}
