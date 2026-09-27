"use client";

import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import EmailDetailPane from "./EmailDetailPane";
import InitialSyncScreen from "./InitialSyncScreen";
import DashboardMetrics from "./DashboardMetrics";
import DashboardFilters from "./DashboardFilters";
import EmailTable from "./EmailTable";

function DashboardContent() {
  const {
    isInitialSyncCompleted,
    emails,
    totalInboxEmails,
    isRateLimited,
    selectedEmail,
    setSelectedEmail
  } = useDashboard();

  if (!isInitialSyncCompleted) {
    return (
      <InitialSyncScreen
        emailsCount={emails.length}
        totalInboxEmails={totalInboxEmails}
        isRateLimited={isRateLimited}
      />
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col p-6 h-full overflow-hidden gap-6">
        <DashboardMetrics />
        <DashboardFilters />
        <EmailTable />
      </div>

      {selectedEmail && (
        <EmailDetailPane 
          email={selectedEmail} 
          onClose={() => setSelectedEmail(null)} 
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
