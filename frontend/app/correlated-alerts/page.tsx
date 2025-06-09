"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CorrelatedAlert {
  id: number
  correlation_type: string
  related_alerts: string[]
  severity: string
  agent_id: string
  correlation_notes: string
  timestamp: string
}

export default function CorrelatedAlertsPage() {
  const [alerts, setAlerts] = useState<CorrelatedAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<CorrelatedAlert | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/correlated-alerts")
      if (!response.ok) throw new Error("Failed to fetch correlated alerts")
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch correlated alerts",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()

    // Poll for updates every 15 seconds
    const interval = setInterval(fetchAlerts, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleRowClick = (alert: CorrelatedAlert) => {
    setSelectedAlert(alert)
    setIsDialogOpen(true)
  }

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
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="section-header">
          <h1 className="section-title">Correlated Alerts</h1>
          <p className="section-description">Monitor security events that match correlation rules</p>
        </div>
        <Button onClick={fetchAlerts} disabled={isLoading} className="modern-button">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Correlated Alerts ({alerts.length})</CardTitle>
          <CardDescription>Click on any row to view full alert details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="modern-table">
            <Table>
              <TableHeader>
                <TableRow className="modern-table-header hover:bg-muted/50">
                  <TableHead className="font-semibold py-4 px-6">ID</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Correlation Type</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Severity</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Agent ID</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Notes</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        {isLoading ? (
                          <>
                            <div className="loading-spinner h-8 w-8"></div>
                            <span className="text-muted-foreground">Loading alerts...</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No correlated alerts found</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow
                      key={alert.id}
                      className="modern-table-row cursor-pointer"
                      onClick={() => handleRowClick(alert)}
                    >
                      <TableCell className="font-mono py-4 px-6">{alert.id}</TableCell>
                      <TableCell className="font-medium py-4 px-6">{alert.correlation_type}</TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant={getSeverityColor(alert.severity)} className="modern-badge">
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">{alert.agent_id}</TableCell>
                      <TableCell className="max-w-md truncate py-4 px-6">{alert.correlation_notes}</TableCell>
                      <TableCell className="py-4 px-6">{new Date(alert.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Correlated Alert Details</DialogTitle>
            <DialogDescription>Full details for Alert ID: {selectedAlert?.id}</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Alert ID</label>
                  <p className="font-mono bg-muted/50 p-3 rounded-lg">{selectedAlert.id}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Correlation Type</label>
                  <p className="font-medium bg-muted/50 p-3 rounded-lg">{selectedAlert.correlation_type}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <div>
                    <Badge variant={getSeverityColor(selectedAlert.severity)} className="modern-badge">
                      {selectedAlert.severity}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Agent ID</label>
                  <p className="bg-muted/50 p-3 rounded-lg">{selectedAlert.agent_id}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="bg-muted/50 p-3 rounded-lg">{new Date(selectedAlert.timestamp).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Related Alerts</label>
                  <p className="bg-muted/50 p-3 rounded-lg">{selectedAlert.related_alerts.length} alert(s)</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Correlation Notes</label>
                <p className="bg-muted/50 p-4 rounded-lg leading-relaxed">{selectedAlert.correlation_notes}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Related Alert IDs</label>
                <div className="flex flex-wrap gap-2">
                  {selectedAlert.related_alerts.map((alertId, index) => (
                    <Badge key={index} variant="outline" className="font-mono modern-badge">
                      {alertId}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Raw Alert Data (JSON)</label>
                <pre className="bg-muted/50 p-4 rounded-lg text-sm overflow-auto font-mono">
                  {JSON.stringify(selectedAlert, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
