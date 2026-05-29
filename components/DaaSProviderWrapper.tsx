/**
 * @buildpad-origin @buildpad/cli/api-routes/DaaSProviderWrapper
 * @buildpad-version 1.0.0
 *
 * This file was copied from Buildpad UI Packages.
 * To update, run: npx @buildpad/cli add api-routes/DaaSProviderWrapper --overwrite
 *
 * Docs: https://buildpad.dev/components/api-routes/DaaSProviderWrapper
 */

/**
 * DaaS Provider Wrapper
 *
 * A 'use client' wrapper that configures DaaSProvider with the DaaS URL
 * and a getToken callback that reads the live Supabase session JWT.
 * Also reads the `daas_resource_uri` cookie and injects it as the
 * `X-Resource-Uri` header so scope-based RBAC works on direct DaaS calls.
 *
 * Usage — place inside app/(authenticated)/layout.tsx, NOT in the root layout:
 *
 *   export default function AuthenticatedLayout({ children }) {
 *     return <DaaSProviderWrapper>{children}</DaaSProviderWrapper>;
 *   }
 *
 * @buildpad/origin: components/DaaSProviderWrapper
 * @buildpad/version: 1.0.0
 */

"use client";
 
import { DaaSProvider } from "@/lib/buildpad/services";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
 
export function DaaSProviderWrapper({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [tokenState, setTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION after cookies are fully parsed —
    // never use getSession() which can return null before cookie parsing finishes.
    // Only set ready when tok is non-null: INITIAL_SESSION can fire with null
    // session when the access token is expired and Supabase is doing a silent refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const tok = session?.access_token ?? null;
      tokenRef.current = tok;
      setTokenState(tok);
      if (tok) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const config = useMemo(
    () => ({
      url: process.env.NEXT_PUBLIC_BUILDPAD_DAAS_URL ?? "",
      token: tokenState ?? undefined, // sync prop so DaaSProvider has token on first render
      getToken: async () => tokenRef.current,
      /**
       * Inject the active tenant scope header into every direct DaaS call.
       * The Next.js middleware stores the scope in a `daas_resource_uri` cookie.
       * Without this header, DaaS falls back to root scope and may return 403
       * for users whose role is only assigned at tenant level.
       */
      getHeaders: async (): Promise<Record<string, string>> => {
        if (typeof document === "undefined") return {};
        const raw = document.cookie
          .split("; ")
          .find((r) => r.startsWith("daas_resource_uri="))
          ?.split("=")[1];
        if (!raw) return {};
        return { "X-Resource-Uri": decodeURIComponent(raw) };
      },
    }),
    [tokenState]
  );

  if (!ready) return null; // block children until auth is fully initialised
  return <DaaSProvider config={config}>{children}</DaaSProvider>;
}
