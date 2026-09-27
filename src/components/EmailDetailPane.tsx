import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import UrgencyIndicator from "./UrgencyIndicator";

export type EmailClassification = {
  category?: { value: string; probability: number };
  isUrgentReply?: { value: boolean; probability: number };
  urgency?: { value: string; probability: number };
  cost?: number;
};

export type Email = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  classification?: EmailClassification;
};

type Props = {
  email: Email | null;
  onClose: () => void;
};

export default function EmailDetailPane({ email, onClose }: Props) {
  if (!email) return null;

  let formattedDate = email.date;
  try {
    formattedDate = format(new Date(email.date), "PPpp");
  } catch (e) {
    // Ignore invalid dates
  }

  return (
    <Sheet open={!!email} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-none p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle>Email Details</SheetTitle>
          <SheetDescription className="sr-only">Detailed view of the selected email.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 flex flex-col gap-6">
            
            {email.classification && (
              <Card className="bg-muted border-border">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm text-primary">Jev Classifications</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="secondary" className="capitalize">
                      {email.classification.category?.value || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Needs Urgent Reply</span>
                    <Badge variant={email.classification.isUrgentReply?.value ? "destructive" : "secondary"}>
                      {email.classification.isUrgentReply?.value ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Urgency</span>
                    <UrgencyIndicator scoreStr={email.classification.urgency?.value} />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Subject</label>
                <div className="font-medium text-foreground mt-1">{email.subject || "(No Subject)"}</div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">From</label>
                <div className="text-sm text-foreground mt-1 break-words">{email.from}</div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">To</label>
                <div className="text-sm text-foreground mt-1 break-words">{email.to}</div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Date</label>
                <div className="text-sm text-foreground mt-1">{formattedDate}</div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Body</label>
                <div className="text-sm text-foreground whitespace-pre-wrap bg-muted p-4 rounded-md border border-border">
                  {email.body || email.snippet}
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
