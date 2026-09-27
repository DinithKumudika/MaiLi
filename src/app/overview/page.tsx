"use client";

import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE', '#ff6666', '#8884d8', '#ff9999', '#66b3ff', '#99ff99'];

export default function OverviewPage() {
  const { emails } = useDashboard();
  const router = useRouter();

  const classifiedEmails = emails.filter(e => e.classification != null);

  const data = useMemo(() => {
    if (classifiedEmails.length === 0) return [];
    
    const categories: Record<string, number> = {};
    classifiedEmails.forEach(email => {
      const cat = email.classification?.category?.value || 'unknown';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [classifiedEmails]);

  const urgencyData = useMemo(() => {
    if (classifiedEmails.length === 0) return [];
    
    const urgencies: Record<string, number> = {};
    classifiedEmails.forEach(email => {
      const urg = email.classification?.urgency?.value || 'unknown';
      urgencies[urg] = (urgencies[urg] || 0) + 1;
    });

    const urgencyLabels: Record<string, string> = {
      '1/5': 'Low',
      '2/5': 'Medium-Low',
      '3/5': 'Medium',
      '4/5': 'High',
      '5/5': 'Critical'
    };

    return Object.entries(urgencies).map(([name, value]) => ({
      name: name !== 'unknown' ? (urgencyLabels[name] || `Urgency: ${name}`) : 'Unknown',
      value,
      // Store original key for sorting
      _rawName: name
    })).sort((a, b) => a._rawName.localeCompare(b._rawName));
  }, [classifiedEmails]);

  const topSenders = useMemo(() => {
    if (classifiedEmails.length === 0) return [];
    const senderStats: Record<string, { emailCount: number, needsReplyCount: number, totalUrgency: number }> = {};
    
    classifiedEmails.forEach(email => {
      const from = email.from || 'unknown';
      const emailAddrMatch = from.match(/<([^>]+)>/);
      const emailAddr = emailAddrMatch ? emailAddrMatch[1] : from;
      
      if (!senderStats[emailAddr]) {
        senderStats[emailAddr] = { emailCount: 0, needsReplyCount: 0, totalUrgency: 0 };
      }
      
      senderStats[emailAddr].emailCount += 1;
      if (email.classification?.isUrgentReply?.value === true) {
        senderStats[emailAddr].needsReplyCount += 1;
      }
      
      const urgScore = parseInt(email.classification?.urgency?.value || '0', 10) || 0;
      senderStats[emailAddr].totalUrgency += urgScore;
    });

    return Object.entries(senderStats)
      .map(([sender, stats]) => ({
        sender,
        ...stats,
        combinedScore: stats.needsReplyCount * stats.totalUrgency // Volume * Urgency combined score
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 5);
  }, [classifiedEmails]);

  const totalNeedsReply = classifiedEmails.filter(e => e.classification?.isUrgentReply?.value === true).length;
  const totalCost = classifiedEmails.reduce((sum, e) => sum + (e.classification?.cost || 0), 0);

  if (classifiedEmails.length === 0) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p className="text-muted-foreground">No classified emails yet. Please wait for the sync and classification to complete.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classification Overview</h2>
          <p className="text-muted-foreground">
            A visual breakdown of your classified inbox.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Emails Analyzed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classifiedEmails.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Requires Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{totalNeedsReply}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Email Categories Breakdown</CardTitle>
              <CardDescription>
                Percentage of emails belonging to each AI-detected category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => {
                        const numericValue = Number(value) || 0;
                        return [
                          `${numericValue} emails (${((numericValue / classifiedEmails.length) * 100).toFixed(1)}%)`,
                          'Count'
                        ];
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Urgency Breakdown</CardTitle>
              <CardDescription>
                Percentage of emails by assigned urgency score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={urgencyData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#82ca9d"
                      dataKey="value"
                    >
                      {urgencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => {
                        const numericValue = Number(value) || 0;
                        return [
                          `${numericValue} emails (${((numericValue / classifiedEmails.length) * 100).toFixed(1)}%)`,
                          'Count'
                        ];
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-white/5">
          <CardHeader>
            <CardTitle>Action Required: Top Senders</CardTitle>
            <CardDescription>
              Senders generating the most urgent workload (ranked by combined volume and urgency)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender</TableHead>
                  <TableHead className="text-right">Total Emails</TableHead>
                  <TableHead className="text-right">Requires Reply</TableHead>
                  <TableHead className="text-right">Action Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSenders.map((sender) => (
                  <TableRow key={sender.sender}>
                    <TableCell className="font-medium text-muted-foreground">{sender.sender}</TableCell>
                    <TableCell className="text-right">{sender.emailCount}</TableCell>
                    <TableCell className="text-right text-destructive font-semibold">
                      {sender.needsReplyCount > 0 ? sender.needsReplyCount : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-mono">{sender.combinedScore}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {topSenders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No actionable senders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
