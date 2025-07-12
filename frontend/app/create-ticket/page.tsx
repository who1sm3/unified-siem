"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, AlertCircle, Users, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface CreateTicketForm {
  alert_id: string
  severity: string
  notes: string
  client_email: string
  assigned_to: string
}

interface Analyst {
  id: number
  email: string
  level: string
}

export default function CreateTicketPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateTicketForm>({
    alert_id: "",
    severity: "medium",
    notes: "",
    client_email: "",
    assigned_to: "",
  })
  const { toast } = useToast()
  const router = useRouter()

  const [analysts, setAnalysts] = useState<Analyst[]>([])
  const [isAnalystsLoading, setIsAnalystsLoading] = useState(true)
  const [analystsError, setAnalystsError] = useState<string | null>(null)

  const fetchAnalysts = async () => {
    setIsAnalystsLoading(true)
    setAnalystsError(null)
    try {
      const response = await fetch("/api/analysts")

      if (!response.ok) {
        throw new Error(`Failed to fetch analysts: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format")
      }

      const data = await response.json()
      setAnalysts(data.analysts || [])
      console.log("Fetched analysts:", data.analysts) // Debug log
    } catch (error) {
      console.error("Failed to fetch analysts:", error)
      setAnalystsError(error instanceof Error ? error.message : "Failed to load analysts")
      setAnalysts([]) // Ensure empty array on error
    } finally {
      setIsAnalystsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysts()
  }, [])

  const handleInputChange = (field: keyof CreateTicketForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAssignmentChange = (value: string) => {
    // Handle the special "unassigned" case
    const assignedValue = value === "unassigned" ? "" : value
    handleInputChange("assigned_to", assignedValue)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/tickets/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          assigned_to: formData.assigned_to || undefined, // Send undefined if empty
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create ticket")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: `Ticket ${result.ticket_id} created successfully`,
      })

      // Reset form
      setFormData({
        alert_id: "",
        severity: "medium",
        notes: "",
        client_email: "",
        assigned_to: "",
      })

      // Redirect to tickets page after a short delay
      setTimeout(() => {
        router.push("/tickets")
      }, 1500)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderAssignmentField = () => {
    if (isAnalystsLoading) {
      return (
        <div className="flex items-center gap-2 p-3 border rounded-xl bg-muted/30">
          <div className="loading-spinner h-4 w-4"></div>
          <span className="text-sm text-muted-foreground">Loading analysts...</span>
        </div>
      )
    }

    if (analystsError) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 border rounded-xl bg-destructive/10 border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Failed to load analysts</span>
            <Button variant="outline" size="sm" onClick={fetchAnalysts} className="ml-auto h-6 px-2">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <Input
            id="assigned_to_manual"
            value={formData.assigned_to}
            onChange={(e) => handleInputChange("assigned_to", e.target.value)}
            placeholder="Enter analyst email manually"
            className="modern-input"
          />
        </div>
      )
    }

    // Always show dropdown if we have analysts data (even if empty)
    return (
      <Select value={formData.assigned_to || "unassigned"} onValueChange={handleAssignmentChange}>
        <SelectTrigger className="modern-input">
          <SelectValue placeholder="Select an analyst or leave unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Leave Unassigned</span>
            </div>
          </SelectItem>
          {analysts.length > 0 ? (
            analysts.map((analyst) => (
              <SelectItem key={analyst.id} value={analyst.email}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span>{analyst.email}</span>
                  <span className="text-xs text-muted-foreground">({analyst.level})</span>
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no_analysts" disabled>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>No analysts available</span>
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <h1 className="section-title">Create Security Ticket</h1>
        <p className="section-description">Create a new ticket for a security incident or alert</p>
      </div>

      <Card className="professional-card mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">New Ticket Details</CardTitle>
          <CardDescription>Fill in the required information to create a security ticket</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="alert_id" className="text-sm font-medium">
                  Alert ID *
                </Label>
                <Input
                  id="alert_id"
                  value={formData.alert_id}
                  onChange={(e) => handleInputChange("alert_id", e.target.value)}
                  placeholder="e.g., 1234567890.123456"
                  className="modern-input"
                  required
                />
                <p className="text-sm text-muted-foreground">The unique identifier of the security alert</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="severity" className="text-sm font-medium">
                  Severity *
                </Label>
                <Select value={formData.severity} onValueChange={(value) => handleInputChange("severity", value)}>
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="client_email" className="text-sm font-medium">
                  Client Email *
                </Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange("client_email", e.target.value)}
                  placeholder="client@company.com"
                  className="modern-input"
                  required
                />
                <p className="text-sm text-muted-foreground">Email address of the client to notify about this ticket</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="assigned_to" className="text-sm font-medium">
                  Assigned To (Optional)
                </Label>
                {renderAssignmentField()}
                <p className="text-sm text-muted-foreground">
                  {!isAnalystsLoading && !analystsError && analysts.length > 0
                    ? `Select from ${analysts.length} available analyst${analysts.length !== 1 ? "s" : ""} or leave unassigned`
                    : analystsError
                      ? "Enter analyst email manually due to loading error"
                      : isAnalystsLoading
                        ? "Loading available analysts..."
                        : "No analysts configured in the system"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="notes" className="text-sm font-medium">
                Initial Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Describe the security incident, initial findings, or any relevant context..."
                rows={6}
                className="modern-input resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Provide any initial analysis, context, or notes about this security incident
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting} className="modern-button w-full py-3">
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating Ticket..." : "Create Security Ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <AlertCircle className="h-5 w-5" />
            Ticket Creation Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Alert ID</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Must correspond to an existing security alert in the system. This links the ticket to the specific
              security event.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Severity Levels</h4>
            <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>
                <strong className="text-foreground">Critical:</strong> Immediate threat requiring urgent response
              </li>
              <li>
                <strong className="text-foreground">High:</strong> Significant security risk requiring prompt attention
              </li>
              <li>
                <strong className="text-foreground">Medium:</strong> Moderate risk requiring timely investigation
              </li>
              <li>
                <strong className="text-foreground">Low:</strong> Minor security concern for routine review
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Analyst Assignment</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can assign the ticket to a specific analyst from the dropdown, or leave it unassigned for later
              assignment. Assigned analysts will receive email notifications about ticket updates.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Client Communication</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The client email will receive automatic notifications when the ticket status changes or when manually
              triggered.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
