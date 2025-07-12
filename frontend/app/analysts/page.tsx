"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Users, Mail, Shield, AlertCircle, RefreshCw } from "lucide-react"

interface Analyst {
  id: number
  level: string
  email: string
}

export default function AnalystsPage() {
  const [analysts, setAnalysts] = useState<Analyst[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAnalyst, setEditingAnalyst] = useState<Analyst | null>(null)
  const [newAnalyst, setNewAnalyst] = useState({ level: "", email: "" })
  const { toast } = useToast()

  const fetchAnalysts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/analysts")

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Analysts endpoint not found. Please ensure the backend server is running.")
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response. Please check if the backend is running correctly.")
      }

      const data = await response.json()
      setAnalysts(data.analysts || [])
    } catch (error) {
      console.error("Error fetching analysts:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch analysts"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysts()
  }, [])

  const handleAddAnalyst = async () => {
    if (!newAnalyst.level || !newAnalyst.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/analysts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnalyst),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Analyst added successfully",
      })
      setNewAnalyst({ level: "", email: "" })
      setIsAddDialogOpen(false)
      fetchAnalysts()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add analyst"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditAnalyst = async () => {
    if (!editingAnalyst) return

    try {
      const response = await fetch(`/api/analysts/${editingAnalyst.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: editingAnalyst.level,
          email: editingAnalyst.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Analyst updated successfully",
      })
      setIsEditDialogOpen(false)
      setEditingAnalyst(null)
      fetchAnalysts()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update analyst"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDeleteAnalyst = async (id: number) => {
    if (!confirm("Are you sure you want to delete this analyst?")) return

    try {
      const response = await fetch(`/api/analysts/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Analyst deleted successfully",
      })
      fetchAnalysts()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete analyst"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "L1":
        return "default"
      case "L2":
        return "secondary"
      case "L3":
        return "outline"
      default:
        return "default"
    }
  }

  const getLevelStats = () => {
    const stats = analysts.reduce(
      (acc, analyst) => {
        acc[analyst.level] = (acc[analyst.level] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return stats
  }

  if (loading) {
    return (
      <div className="page-container animate-fade-in">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading analysts...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container animate-fade-in">
        <div className="section-header">
          <h1 className="section-title">Security Analysts</h1>
          <p className="section-description">Manage security analyst roles and email notifications</p>
        </div>

        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchAnalysts} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>

        <Card className="professional-card">
          <CardHeader>
            <CardTitle>Backend Connection Issue</CardTitle>
            <CardDescription>
              Unable to connect to the analysts management system. Please check the following:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Troubleshooting Steps:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Ensure the Flask backend server is running on port 5000</li>
                <li>Check that the database is properly initialized</li>
                <li>Verify the analysts API endpoints are available</li>
                <li>Check the browser console for additional error details</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Expected Backend Commands:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                <div>cd backend</div>
                <div>python main.py</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const levelStats = getLevelStats()

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="section-header">
          <h1 className="section-title">Security Analysts</h1>
          <p className="section-description">Manage security analyst roles and email notifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnalysts} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="modern-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Analyst
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>Add New Analyst</DialogTitle>
                <DialogDescription>Add a new security analyst to receive email notifications.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="level">Security Level</Label>
                  <Select
                    value={newAnalyst.level}
                    onValueChange={(value) => setNewAnalyst({ ...newAnalyst, level: value })}
                  >
                    <SelectTrigger className="modern-input">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L1">L1 - Junior Analyst</SelectItem>
                      <SelectItem value="L2">L2 - Analyst</SelectItem>
                      <SelectItem value="L3">L3 - Senior Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAnalyst.email}
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, email: e.target.value })}
                    placeholder="analyst@company.com"
                    className="modern-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAnalyst} className="modern-button">
                  Add Analyst
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analysts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysts.length}</div>
          </CardContent>
        </Card>
        {["L1", "L2", "L3"].map((level) => (
          <Card key={level} className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{level} Analysts</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{levelStats[level] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analysts Table */}
      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Mail className="h-5 w-5" />
            Security Analysts
          </CardTitle>
          <CardDescription>Manage analyst email notifications and security levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="modern-table">
            <Table>
              <TableHeader>
                <TableRow className="modern-table-header hover:bg-muted/50">
                  <TableHead className="font-semibold py-4 px-6">Level</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Email Address</TableHead>
                  <TableHead className="font-semibold py-4 px-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <Users className="h-16 w-16 text-muted-foreground/50" />
                        <div className="space-y-2 text-center">
                          <p className="text-muted-foreground font-medium">No analysts found</p>
                          <p className="text-sm text-muted-foreground/70">
                            Add your first analyst to get started with email notifications
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  analysts.map((analyst) => (
                    <TableRow key={analyst.id} className="modern-table-row">
                      <TableCell className="py-4 px-6">
                        <Badge variant={getLevelBadgeVariant(analyst.level)} className="modern-badge">
                          {analyst.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium py-4 px-6">{analyst.email}</TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAnalyst(analyst)
                              setIsEditDialogOpen(true)
                            }}
                            className="h-8 px-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAnalyst(analyst.id)}
                            className="h-8 px-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Analyst</DialogTitle>
            <DialogDescription>Update analyst information and security level.</DialogDescription>
          </DialogHeader>
          {editingAnalyst && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-level">Security Level</Label>
                <Select
                  value={editingAnalyst.level}
                  onValueChange={(value) => setEditingAnalyst({ ...editingAnalyst, level: value })}
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L1">L1 - Junior Analyst</SelectItem>
                    <SelectItem value="L2">L2 - Analyst</SelectItem>
                    <SelectItem value="L3">L3 - Senior Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingAnalyst.email}
                  onChange={(e) => setEditingAnalyst({ ...editingAnalyst, email: e.target.value })}
                  className="modern-input"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAnalyst} className="modern-button">
              Update Analyst
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
