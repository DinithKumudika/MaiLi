"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/contexts/DashboardContext";

export default function NavigationTabs() {
  const pathname = usePathname();
  const { emails } = useDashboard();
  
  // Tab should only show if at least one email is classified
  const hasClassifiedEmails = emails.some(e => e.classification != null);

  if (!hasClassifiedEmails) return null;

  return (
    <div className="border-b border-border bg-background px-6 flex items-center">
      <Link 
        href="/" 
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${pathname === '/' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
      >
        Inbox
      </Link>
      <Link 
        href="/overview" 
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${pathname === '/overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
      >
        Overview
      </Link>
    </div>
  );
}
