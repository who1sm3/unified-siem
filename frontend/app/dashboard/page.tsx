"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingUp, AlertTriangle, FileText, Shield, Activity, Zap, Eye } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface Log {
  alert_id: string
  level: number
  agent: string
  description: string
  timestamp: string
}

interface Alert {
  id: number
  alert_id: string
  status: string
  severity: string
  assigned_to: string
}

interface CorrelatedAlert {
  id: number
  correlation_type: string
  related_alerts: string[]
  severity: string
  agent_id: string
  correlation_notes: string
  timestamp: string
}

interface SeverityData {
  severity: string
  count: number
  fill: string
}

interface TimeData {
  time: string
  count: number
}

interface StatusData {
  status: string
  count: number
  fill: string
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [tickets, setTickets] = useState<Alert[]>([])
  const [correlatedAlerts, setCorrelatedAlerts] = useState<CorrelatedAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchAllData = async () => {
    try {
      const [logsResponse, ticketsResponse, alertsResponse] = await Promise.all([
        fetch("/api/logs/search?q="),
        fetch("/api/tickets/search?q="),
        fetch("/api/correlated-alerts"),
      ])

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData)
      }

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json()
        setTickets(ticketsData.results || [])
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setCorrelatedAlerts(alertsData.slice(0, 10))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 15000)
    return () => clearInterval(interval)
  }, [])

  // Process data for charts
  const severityData: SeverityData[] = (() => {
    const severityCounts = logs.reduce(
      (acc, log) => {
        let severity: string
        let color: string

        if (log.level >= 10) {
          severity = "Critical"
          color = "hsl(var(--destructive))"
        } else if (log.level >= 7) {
          severity = "High"
          color = "hsl(24 95% 53%)"
        } else if (log.level >= 4) {
          severity = "Medium"
          color = "hsl(48 96% 53%)"
        } else {
          severity = "Low"
          color = "hsl(142 76% 36%)"
        }

        acc[severity] = (acc[severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(severityCounts).map(([severity, count]) => ({
      severity,
      count,
      fill:
        severity === "Critical"
          ? "hsl(var(--destructive))"
          : severity === "High"
            ? "hsl(24 95% 53%)"
            : severity === "Medium"
              ? "hsl(48 96% 53%)"
              : "hsl(142 76% 36%)",
    }))
  })()

  const timeData: TimeData[] = (() => {
    const timeCounts = logs.reduce(
      (acc, log) => {
        const date = new Date(log.timestamp)
        const timeKey = `${date.getHours().toString().padStart(2, "0")}:${Math.floor(date.getMinutes() / 10) * 10}`
        acc[timeKey] = (acc[timeKey] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(timeCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }))
  })()

  const statusData: StatusData[] = (() => {
    const statusCounts = tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.replace("_", " ").toUpperCase(),
      count,
      fill:
        status === "new"
          ? "hsl(var(--destructive))"
          : status === "in_progress"
            ? "hsl(48 96% 53%)"
            : "hsl(142 76% 36%)",
    }))
  })()

  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive"
      case "high":
        return "default"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container animate-fade-in">
        {/* Professional Header Section */}
        <div className="relative overflow-hidden rounded-2xl siem-header p-8 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Security Operations Center
              </h1>
              <p className="text-lg text-blue-100 leading-relaxed max-w-2xl">
                Real-time threat monitoring and incident management dashboard
              </p>
            </div>
            <Button
              onClick={fetchAllData}
              disabled={isLoading}
              className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 text-white rounded-xl px-6 py-3 font-medium shadow-lg"
            >
              <RefreshCw className={`mr-2 h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10 animate-pulse-slow"></div>
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/5"></div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="stat-card animate-slide-up" style={{ animationDelay: "0ms" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground leading-tight">
                  Total Security Events
                </CardTitle>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-primary leading-none">{logs.length.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground leading-tight">Events detected today</p>
            </CardContent>
          </Card>

          <Card className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground leading-tight">
                  Active Incidents
                </CardTitle>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-destructive to-destructive/80 p-3 shadow-lg">
                <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-destructive leading-none">
                {tickets.filter((t) => t.status !== "resolved").length}
              </div>
              <p className="text-sm text-muted-foreground leading-tight">Requiring immediate attention</p>
            </CardContent>
          </Card>

          <Card className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground leading-tight">
                  Pattern Detections
                </CardTitle>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-blue-600 leading-none">{correlatedAlerts.length}</div>
              <p className="text-sm text-muted-foreground leading-tight">Correlated threat patterns</p>
            </CardContent>
          </Card>

          <Card className="stat-card animate-slide-up" style={{ animationDelay: "300ms" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground leading-tight">
                  Critical Threats
                </CardTitle>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 shadow-lg critical-glow">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-red-600 leading-none">
                {logs.filter((l) => l.level >= 10).length}
              </div>
              <p className="text-sm text-muted-foreground leading-tight">High-priority incidents</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts Section */}
        <div className="grid gap-8 lg:grid-cols-3 mb-8">
          {/* Severity Distribution */}
          <Card className="chart-card animate-slide-up" style={{ animationDelay: "400ms" }}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-foreground leading-tight">
                    Threat Severity Analysis
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-tight">
                    Security alerts by severity level
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={severityData} 
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="severity" 
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px hsl(var(--foreground) / 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Timeline Chart */}
          <Card className="chart-card animate-slide-up" style={{ animationDelay: "500ms" }}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-foreground leading-tight">Alert Timeline</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-tight">
                    Real-time security event frequency
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={timeData} 
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px hsl(var(--foreground) / 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Status Pie Chart */}
          <Card className="chart-card animate-slide-up" style={{ animationDelay: "600ms" }}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-3 shadow-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-foreground leading-tight">
                    Incident Status Overview
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-tight">
                    Current ticket status distribution
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="45%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={2}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px hsl(var(--foreground) / 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: "11px",
                        color: "hsl(var(--muted-foreground))"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Alerts Table */}
        <Card className="professional-card animate-slide-up" style={{ animationDelay: "700ms" }}>
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-destructive to-destructive/80 p-3 shadow-lg">
                <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold text-foreground leading-tight">
                  Recent Correlated Threats
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-tight">
                  Latest pattern-based security detections requiring attention
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="modern-table">
              <Table>
                <TableHeader>
                  <TableRow className="modern-table-header hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground py-4 px-6">Alert ID</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Agent</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Severity</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Detection Type</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correlatedAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center gap-4">
                          {isLoading ? (
                            <>
                              <div className="loading-spinner h-10 w-10"></div>
                              <span className="text-muted-foreground font-medium">Loading threat intelligence...</span>
                            </>
                          ) : (
                            <>
                              <Shield className="h-16 w-16 text-muted-foreground/50" />
                              <div className="space-y-2 text-center">
                                <p className="text-muted-foreground font-medium">No correlated threats detected</p>
                                <p className="text-sm text-muted-foreground/70">Your systems are currently secure</p>
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    correlatedAlerts.map((alert, index) => (
                      <TableRow
                        key={alert.id}
                        className="modern-table-row"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <TableCell className="font-mono text-sm font-medium text-foreground py-4 px-6">
                          {alert.id}
                        </TableCell>
                        <TableCell className="font-medium text-foreground py-4 px-6">{alert.agent_id}</TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge
                            variant={getSeverityColor(alert.severity)}
                            className="modern-badge font-medium shadow-sm"
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate font-medium text-foreground py-4 px-6">
                          {alert.correlation_type}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground py-4 px-6">
                          {new Date(alert.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
