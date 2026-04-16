/**
 * TeamForge — Root Layout Component
 *
 * Wraps every page with the sidebar, global styles, and toast notifications.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import Sidebar from "./Sidebar";
import { isAuthenticated } from "../lib/auth";

// Pages that don't require authentication
const PUBLIC_ROUTES = ["/"];

export default function Layout({ children, title = "TeamForge" }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!PUBLIC_ROUTES.includes(router.pathname) && !isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  const isPublic = PUBLIC_ROUTES.includes(router.pathname);

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>{title} | TeamForge</title>
        <meta name="description" content="Real-time collaborative project management for engineering teams." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="min-h-screen bg-surface-0 text-white font-sans">
        {!isPublic ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-surface-0">
              <div className="p-6 animate-fade-in">{children}</div>
            </main>
          </div>
        ) : (
          <main>{children}</main>
        )}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1c1c29",
              color: "#ffffff",
              border: "1px solid rgba(99,102,241,0.3)",
            },
          }}
        />
      </div>
    </>
  );
}
