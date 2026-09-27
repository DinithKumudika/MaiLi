"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Dashboard from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if ((session as any)?.error === "RefreshAccessTokenError") {
      signIn("google"); // Force sign in to resolve error
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center flex flex-col gap-2">
            <CardTitle className="text-2xl font-bold text-primary">Email Classifier</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Sign in with your Google account to analyze your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8 pt-4">
            <Button onClick={() => signIn("google")} size="lg" className="w-full max-w-sm">
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <Dashboard />
      </main>
    </div>
  );
}
