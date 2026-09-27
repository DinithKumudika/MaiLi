"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import NavigationTabs from "./NavigationTabs";

export default function Header() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div className="flex flex-col">
      <header className="bg-muted/30 border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Email Classifier</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{session.user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </header>
      <NavigationTabs />
    </div>
  );
}
