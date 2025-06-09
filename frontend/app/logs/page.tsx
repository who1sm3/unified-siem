"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Log {
  alert_id: string
  level: number
  agent: string
  description: string
  timestamp: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchLogs = async (query = "") => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/logs/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Failed to fetch logs")
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch logs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchLogs(searchQuery)
    }, 10000)

    return () => clearInterval(interval)
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs(searchQuery)
  }

  const handleRowClick = (log: Log) => {
    setSelectedLog(log)
    setIsDialogOpen(true)
  }

  const getSeverityColor = (level: number) => {
    if (level >= 10) return "destructive"
    if (level >= 7) return "default"
    return "secondary"
  }

  const getSeverityText = (level: number) => {
    if (level >= 10) return "Critical"
    if (level >= 7) return "High"
    if (level >= 4) return "Medium"
    return "Low"
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <h1 className="section-title">Security Logs</h1>
        <p className="section-description">Search and monitor security events in real-time</p>
      </div>

      <Card className="professional-card mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Log Search</CardTitle>
          <CardDescription>Search logs by Alert ID, Rule Description, or Agent Name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="modern-input pl-10"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="modern-button px-6">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Logs ({logs.length})</CardTitle>
          <CardDescription>Click on any row to view full log details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="modern-table">
            <Table>
              <TableHeader>
                <TableRow className="modern-table-header hover:bg-muted/50">
                  <TableHead className="font-semibold py-4 px-6">Alert ID</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Severity</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Agent</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Description</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        {isLoading ? (
                          <>
                            <div className="loading-spinner h-8 w-8"></div>
                            <span className="text-muted-foreground">Loading logs...</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No logs found</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log.alert_id}
                      className="modern-table-row cursor-pointer"
                      onClick={() => handleRowClick(log)}
                    >
                      <TableCell className="font-mono text-sm py-4 px-6">{log.alert_id}</TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant={getSeverityColor(log.level)} className="modern-badge">
                          {getSeverityText(log.level)} ({log.level})
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">{log.agent}</TableCell>
                      <TableCell className="max-w-md truncate py-4 px-6">{log.description}</TableCell>
                      <TableCell className="py-4 px-6">{new Date(log.timestamp).toLocaleString()}</TableCell>
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
            <DialogTitle className="text-xl font-semibold">Log Details</DialogTitle>
            <DialogDescription>Full details for Alert ID: {selectedLog?.alert_id}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Alert ID</label>
                  <p className="font-mono text-sm bg-muted/50 p-3 rounded-lg">{selectedLog.alert_id}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <div>
                    <Badge variant={getSeverityColor(selectedLog.level)} className="modern-badge">
                      {getSeverityText(selectedLog.level)} ({selectedLog.level})
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Agent</label>
                  <p className="bg-muted/50 p-3 rounded-lg">{selectedLog.agent}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="bg-muted/50 p-3 rounded-lg">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="bg-muted/50 p-4 rounded-lg leading-relaxed">{selectedLog.description}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Raw Log Data (JSON)</label>
                <pre className="bg-muted/50 p-4 rounded-lg text-sm overflow-auto font-mono">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
