"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { signOut } from "next-auth/react";
import { Email } from "@/components/EmailDetailPane";
import { inboxSyncRunner, InboxSyncState } from "@/lib/runners/InboxSyncRunner";
import { ClassificationRunner, ClassificationState } from "@/lib/runners/ClassificationRunner";

interface DashboardContextType extends InboxSyncState, ClassificationState {
  avgTimeMs: number;
  selectedEmail: Email | null;
  setSelectedEmail: (email: Email | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  urgencyFilter: string;
  setUrgencyFilter: (filter: string) => void;
  urgentReplyOnly: boolean;
  setUrgentReplyOnly: (urgent: boolean) => void;
  sortField: "date" | "urgency";
  setSortField: (field: "date" | "urgency") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  filteredAndSortedEmails: Email[];
  startClassification: () => void;
  stopClassification: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  // Sync state
  const [syncState, setSyncState] = useState<InboxSyncState>(inboxSyncRunner.getState());
  
  // Classification runner instance
  const [classificationRunner, setClassificationRunner] = useState<ClassificationRunner | null>(null);
  const [classificationState, setClassificationState] = useState<ClassificationState>({
    isClassifying: false,
    classifiedCount: 0,
    totalTimeMs: 0,
    totalCost: 0
  });

  // UI state
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [urgentReplyOnly, setUrgentReplyOnly] = useState(false);
  const [sortField, setSortField] = useState<"date" | "urgency">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Subscribe to InboxSyncRunner
  useEffect(() => {
    const unsubscribe = inboxSyncRunner.subscribe(setSyncState);
    const unsubscribeAuth = inboxSyncRunner.onAuthError(() => signOut());
    
    // Auto-start inbox sync
    inboxSyncRunner.start();

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, []);

  // Initialize ClassificationRunner
  useEffect(() => {
    const runner = new ClassificationRunner(
      () => inboxSyncRunner.getState().emails,
      () => inboxSyncRunner.getState().loadingEmails,
      (index, classification) => {
        inboxSyncRunner.setEmails(prev => {
          const next = [...prev];
          next[index] = { ...next[index], classification };
          return next;
        });
      }
    );
    
    setClassificationRunner(runner);
    const unsubscribe = runner.subscribe(setClassificationState);
    
    return () => {
      unsubscribe();
      runner.stop();
    };
  }, []);

  const avgTimeMs = classificationState.classifiedCount > 0 
    ? classificationState.totalTimeMs / classificationState.classifiedCount 
    : 0;

  const filteredAndSortedEmails = useMemo(() => {
    return syncState.emails
      .filter((email) => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchesSubject = email.subject?.toLowerCase().includes(term);
          const matchesSender = email.from?.toLowerCase().includes(term);
          if (!matchesSubject && !matchesSender) return false;
        }
        if (categoryFilter !== "all") {
          if (email.classification?.category?.value !== categoryFilter) return false;
        }
        if (urgencyFilter !== "all") {
          const scoreStr = email.classification?.urgency?.value;
          if (!scoreStr || scoreStr === "N/A") return false;
          const score = parseInt(scoreStr.split("/")[0], 10);
          const max = parseInt(scoreStr.split("/")[1], 10) || 5;
          const ratio = score / max;
          if (urgencyFilter === "high" && ratio < 0.8) return false;
        }
        if (urgentReplyOnly) {
          if (email.classification?.isUrgentReply?.value !== true) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === "date") {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        } else if (sortField === "urgency") {
          const getScore = (e: Email) => {
            const scoreStr = e.classification?.urgency?.value;
            if (!scoreStr || scoreStr === "N/A") return -1;
            const score = parseInt(scoreStr.split("/")[0], 10);
            const max = parseInt(scoreStr.split("/")[1], 10) || 5;
            return score / max;
          };
          const scoreA = getScore(a);
          const scoreB = getScore(b);
          return sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
        }
        return 0;
      });
  }, [
    syncState.emails,
    searchTerm,
    categoryFilter,
    urgencyFilter,
    urgentReplyOnly,
    sortField,
    sortOrder
  ]);

  return (
    <DashboardContext.Provider value={{
      ...syncState,
      ...classificationState,
      avgTimeMs,
      selectedEmail,
      setSelectedEmail,
      searchTerm,
      setSearchTerm,
      categoryFilter,
      setCategoryFilter,
      urgencyFilter,
      setUrgencyFilter,
      urgentReplyOnly,
      setUrgentReplyOnly,
      sortField,
      setSortField,
      sortOrder,
      setSortOrder,
      filteredAndSortedEmails,
      startClassification: () => classificationRunner?.start(),
      stopClassification: () => classificationRunner?.stop(),
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
