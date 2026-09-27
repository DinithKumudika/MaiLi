"use client";

import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (classifiedEmails.length === 0) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p className="text-muted-foreground">No classified emails yet. Please wait for the sync and classification to complete.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classification Overview</h2>
          <p className="text-muted-foreground">
            A visual breakdown of your classified inbox.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="col-span-1 md:col-span-2 shadow-sm">
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
                      outerRadius={130}
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
        </div>
      </div>
    </div>
  );
}
