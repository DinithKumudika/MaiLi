import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDashboard } from "@/contexts/DashboardContext";
import { useState } from "react";

export default function DashboardMetrics() {
  const {
    emails,
    classifiedCount,
    totalTimeMs,
    totalCost,
    avgTimeMs,
    loadingEmails,
    isInitialSyncCompleted,
    totalInboxEmails,
    isClassifying,
    isRateLimited,
    startClassification: onStartClassification,
    stopClassification: onStopClassification,
  } = useDashboard();

  const [runForAll, setRunForAll] = useState(false);

  const emailsCount = emails.length;

  return (
    <div className="flex items-center justify-between bg-muted/30 border border-border rounded-xl p-4">
      <div className="flex items-center gap-8 px-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Total Emails
          </span>
          <span className="text-2xl font-bold">{emailsCount}</span>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Classified
          </span>
          <span className="text-2xl font-bold text-primary">
            {classifiedCount}{" "}
            <span className="text-base text-muted-foreground font-normal">
              / {emailsCount}
            </span>
          </span>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Total Time
          </span>
          <span className="text-2xl font-bold">
            {(totalTimeMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Total Cost
          </span>
          <span className="text-2xl font-bold">${totalCost.toFixed(5)}</span>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Time per email
          </span>
          <span className="text-2xl font-bold">
            {(avgTimeMs / 1000).toFixed(2)}s
          </span>
        </div>
        {loadingEmails && isInitialSyncCompleted && (
          <>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col min-w-[120px]">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                Background Sync
                {isRateLimited && (
                  <span className="text-destructive font-bold text-[10px] animate-pulse">
                    (PAUSED: QUOTA)
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${
                        totalInboxEmails > 0
                          ? Math.min(
                              100,
                              (emailsCount / totalInboxEmails) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(
                    totalInboxEmails > 0
                      ? (emailsCount / totalInboxEmails) * 100
                      : 0
                  )}
                  %
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 pr-2">
        {!isClassifying && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="run-for-all" 
              checked={runForAll} 
              onCheckedChange={(checked) => setRunForAll(checked as boolean)}
            />
            <label
              htmlFor="run-for-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground whitespace-nowrap"
            >
              Run for all
            </label>
          </div>
        )}
        {isClassifying ? (
          <Button
            onClick={onStopClassification}
            variant="destructive"
            size="lg"
            className="px-8 font-semibold"
          >
            Stop
          </Button>
        ) : (
          <Button
            onClick={() => onStartClassification(runForAll)}
            disabled={emailsCount === 0}
            size="lg"
            className="px-8 font-semibold"
          >
            Analyze Inbox
          </Button>
        )}
      </div>
    </div>
  );
}
