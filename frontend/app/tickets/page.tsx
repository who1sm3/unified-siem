"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, RefreshCw, UserPlus, CheckCircle, RotateCcw, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Ticket {
  id: number
  alert_id: string
  status: string
  severity: string
  assigned_to: string
}

interface Analyst {
  id: number
  level: string
  email: string
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [analysts, setAnalysts] = useState<Analyst[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalystsLoading, setIsAnalystsLoading] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Form states for ticket actions
  const [assignTo, setAssignTo] = useState("")
  const [closeNotes, setCloseNotes] = useState("")

  const { toast } = useToast()

  const fetchTickets = async (query = "") => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tickets/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Failed to fetch tickets")
      const data = await response.json()
      setTickets(data.results || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnalysts = async () => {
    setIsAnalystsLoading(true)
    try {
      const response = await fetch("/api/analysts")
      if (!response.ok) throw new Error("Failed to fetch analysts")
      const data = await response.json()
      setAnalysts(data.analysts || [])
    } catch (error) {
      console.error("Failed to fetch analysts:", error)
    } finally {
      setIsAnalystsLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    fetchAnalysts()

    // Poll for updates every 15 seconds
    const interval = setInterval(() => {
      fetchTickets(searchQuery)
    }, 15000)

    return () => clearInterval(interval)
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTickets(searchQuery)
  }

  const handleRowClick = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setAssignTo(ticket.assigned_to || "")
    setCloseNotes("")
    setIsDialogOpen(true)
  }

  const handleAssignTicket = async () => {
    if (!selectedTicket || !assignTo.trim()) return

    setActionLoading("assign")
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_to: assignTo,
          user: "frontend-user",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to assign ticket")
      }

      toast({
        title: "Success",
        description: `Ticket ${selectedTicket.id} assigned to ${assignTo}`,
      })

      fetchTickets(searchQuery)
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign ticket",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedTicket) return

    setActionLoading("close")
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: closeNotes,
          user: "frontend-user",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to close ticket")
      }

      toast({
        title: "Success",
        description: `Ticket ${selectedTicket.id} closed successfully`,
      })

      fetchTickets(searchQuery)
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to close ticket",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReopenTicket = async () => {
    if (!selectedTicket) return

    setActionLoading("reopen")
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "frontend-user" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reopen ticket")
      }

      toast({
        title: "Success",
        description: `Ticket ${selectedTicket.id} reopened successfully`,
      })

      fetchTickets(searchQuery)
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reopen ticket",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmailClient = async () => {
    if (!selectedTicket) return

    setActionLoading("email")
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/email-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send email")
      }

      toast({
        title: "Success",
        description: "Email sent to client successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "default"
      case "in_progress":
        return "secondary"
      case "resolved":
        return "outline"
      default:
        return "secondary"
    }
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
      <div className="section-header">
        <h1 className="section-title">Security Tickets</h1>
        <p className="section-description">Manage and track security incident tickets</p>
      </div>

      <Card className="professional-card mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ticket Search</CardTitle>
          <CardDescription>Search tickets by Alert ID, Notes, or Assigned To</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
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
          <CardTitle className="text-lg font-semibold">Tickets ({tickets.length})</CardTitle>
          <CardDescription>Click on any row to manage the ticket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="modern-table">
            <Table>
              <TableHeader>
                <TableRow className="modern-table-header hover:bg-muted/50">
                  <TableHead className="font-semibold py-4 px-6">Ticket ID</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Alert ID</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Status</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Severity</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        {isLoading ? (
                          <>
                            <div className="loading-spinner h-8 w-8"></div>
                            <span className="text-muted-foreground">Loading tickets...</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No tickets found</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="modern-table-row cursor-pointer"
                      onClick={() => handleRowClick(ticket)}
                    >
                      <TableCell className="font-mono py-4 px-6">{ticket.id}</TableCell>
                      <TableCell className="font-mono text-sm py-4 px-6">{ticket.alert_id}</TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant={getStatusColor(ticket.status)} className="modern-badge">
                          {ticket.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant={getSeverityColor(ticket.severity)} className="modern-badge">
                          {ticket.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">{ticket.assigned_to || "Unassigned"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Manage Ticket #{selectedTicket?.id}</DialogTitle>
            <DialogDescription>Perform actions on this security ticket</DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Ticket ID</Label>
                  <p className="font-mono bg-muted/50 p-3 rounded-lg">{selectedTicket.id}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Alert ID</Label>
                  <p className="font-mono text-sm bg-muted/50 p-3 rounded-lg">{selectedTicket.alert_id}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant={getStatusColor(selectedTicket.status)} className="modern-badge">
                      {selectedTicket.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Severity</Label>
                  <div>
                    <Badge variant={getSeverityColor(selectedTicket.severity)} className="modern-badge">
                      {selectedTicket.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Assign Ticket */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Assign Ticket</Label>
                {isAnalystsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="loading-spinner h-4 w-4"></div>
                    <span className="text-sm text-muted-foreground">Loading analysts...</span>
                  </div>
                ) : analysts.length > 0 ? (
                  <div className="flex gap-3">
                    <Select value={assignTo} onValueChange={setAssignTo}>
                      <SelectTrigger className="modern-input flex-1">
                        <SelectValue placeholder="Select an analyst" />
                      </SelectTrigger>
                      <SelectContent>
                        {analysts.map((analyst) => (
                          <SelectItem key={analyst.id} value={analyst.email}>
                            {analyst.email} ({analyst.level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssignTicket}
                      disabled={!assignTo.trim() || actionLoading === "assign"}
                      className="modern-button"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {actionLoading === "assign" ? "Assigning..." : "Assign"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Input
                      placeholder="Enter analyst email or name"
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                      className="modern-input flex-1"
                    />
                    <Button
                      onClick={handleAssignTicket}
                      disabled={!assignTo.trim() || actionLoading === "assign"}
                      className="modern-button"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {actionLoading === "assign" ? "Assigning..." : "Assign"}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  The assigned analyst will receive email notifications about this ticket
                </p>
              </div>

              {/* Close Ticket */}
              {selectedTicket.status !== "resolved" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Close Ticket</Label>
                  <Textarea
                    placeholder="Enter resolution notes..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    rows={3}
                    className="modern-input resize-none"
                  />
                  <Button
                    onClick={handleCloseTicket}
                    disabled={actionLoading === "close"}
                    variant="outline"
                    className="w-full"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {actionLoading === "close" ? "Closing..." : "Close Ticket"}
                  </Button>
                </div>
              )}

              {/* Reopen Ticket */}
              {selectedTicket.status === "resolved" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Reopen Ticket</Label>
                  <Button
                    onClick={handleReopenTicket}
                    disabled={actionLoading === "reopen"}
                    variant="outline"
                    className="w-full"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {actionLoading === "reopen" ? "Reopening..." : "Reopen Ticket"}
                  </Button>
                </div>
              )}

              {/* Email Client */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Client Communication</Label>
                <Button
                  onClick={handleEmailClient}
                  disabled={actionLoading === "email"}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {actionLoading === "email" ? "Sending..." : "Email Client"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Send an email notification to the client with the current ticket status
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
