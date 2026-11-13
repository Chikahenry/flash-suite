"use client";

import { useState, type ReactNode } from "react";
import { RaiseRequestModal, type RaiseRequestConfig } from "./raise-request-modal";

/** Gives a screen a `raise(config)` function plus the modal element to render once. */
export function useRaise(): [(config: RaiseRequestConfig) => void, ReactNode] {
  const [config, setConfig] = useState<RaiseRequestConfig | null>(null);
  return [setConfig, <RaiseRequestModal key="raise" config={config} onClose={() => setConfig(null)} />];
}
