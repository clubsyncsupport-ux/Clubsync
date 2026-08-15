"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Deliberately set after mount, not via a lazy useState initializer: computing this
    // during render would mismatch the server-rendered HTML for standalone/installed clients.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install App</CardTitle>
      </CardHeader>
      <CardContent>
        {installed ? (
          <p className="text-sm text-success">Installed ✓</p>
        ) : deferredPrompt ? (
          <Button
            onClick={async () => {
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
            }}
          >
            📥 Install ClubSync
          </Button>
        ) : (
          <p className="text-sm text-text-secondary">
            On iPhone: tap Share → &ldquo;Add to Home Screen&rdquo;. On Android/Chrome: open the browser menu → &ldquo;Install app&rdquo;.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
