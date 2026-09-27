import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import UrgencyIndicator from "./UrgencyIndicator";
import { Card } from "@/components/ui/card";
import { useDashboard } from "@/contexts/DashboardContext";

export default function EmailTable() {
  const {
    filteredAndSortedEmails: filteredEmails,
    emails,
    loadingEmails,
    selectedEmail,
    setSelectedEmail: onSelectEmail,
  } = useDashboard();
  
  const totalEmailsCount = emails.length;

  return (
    <Card className="flex-1 overflow-hidden flex flex-col shadow-none border-0 bg-transparent">
      {loadingEmails && totalEmailsCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="size-4 rounded-full bg-primary/20 animate-pulse" />
            <div className="size-4 rounded-full bg-primary/40 animate-pulse delay-75" />
            <div className="size-4 rounded-full bg-primary/60 animate-pulse delay-150" />
          </div>
          <p className="text-muted-foreground font-medium">
            Fetching emails from Gmail...
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative rounded-xl border border-white/5 bg-black/20">
          <Table wrapperClassName="h-full overflow-auto">
            <TableHeader className="bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
              <TableRow>
                <TableHead className="w-[35%]">Subject</TableHead>
                <TableHead className="w-[25%]">From</TableHead>
                <TableHead className="w-[15%]">Category</TableHead>
                <TableHead className="w-[10%]">Urgency</TableHead>
                <TableHead className="w-[15%] text-right pr-6">Needs Reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                      <p className="text-lg font-medium text-foreground">
                        {totalEmailsCount === 0
                          ? "Your inbox is empty"
                          : "No emails match your filters"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {totalEmailsCount === 0
                          ? "We couldn't find any recent emails to classify."
                          : "Try adjusting your search term or dropdown settings."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <TableRow
                      key={email.id}
                      onClick={() => onSelectEmail(email)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected && "bg-muted/50 hover:bg-muted/80"
                      )}
                    >
                      <TableCell className="font-medium max-w-[300px] truncate text-foreground/90">
                        {email.subject || "(No Subject)"}
                      </TableCell>
                      <TableCell className="text-muted-foreground/70 font-mono text-[12px] max-w-[200px] truncate tracking-tight">
                        {email.from}
                      </TableCell>
                      <TableCell>
                        {email.classification ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/5 text-muted-foreground border border-white/5">
                            {email.classification.category?.value || "N/A"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {email.classification ? (
                          <UrgencyIndicator scoreStr={email.classification.urgency?.value} />
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {email.classification ? (
                          email.classification.isUrgentReply?.value ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                              Urgent
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-[12px]">No</span>
                          )
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
