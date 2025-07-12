"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"

interface CorrelationRuleForm {
  rule_name: string
  keyword: string
  threshold: number
  interval: string
  severity: string
  description: string
}

export default function CorrelationRulesPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CorrelationRuleForm>({
    rule_name: "",
    keyword: "",
    threshold: 1,
    interval: "5 minutes",
    severity: "medium",
    description: "",
  })
  const { toast } = useToast()

  const handleInputChange = (field: keyof CorrelationRuleForm, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/correlation-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create correlation rule")
      }

      toast({
        title: "Success",
        description: "Correlation rule created successfully",
      })

      // Reset form
      setFormData({
        rule_name: "",
        keyword: "",
        threshold: 1,
        interval: "5 minutes",
        severity: "medium",
        description: "",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create correlation rule",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <h1 className="section-title">Correlation Rules</h1>
        <p className="section-description">Create rules to automatically correlate security events</p>
      </div>

      <Card className="professional-card mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Create New Correlation Rule</CardTitle>
          <CardDescription>Define patterns to automatically detect related security events</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="rule_name" className="text-sm font-medium">
                  Rule Name *
                </Label>
                <Input
                  id="rule_name"
                  value={formData.rule_name}
                  onChange={(e) => handleInputChange("rule_name", e.target.value)}
                  placeholder="e.g., Multiple Failed Logins"
                  className="modern-input"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="keyword" className="text-sm font-medium">
                  Keyword *
                </Label>
                <Input
                  id="keyword"
                  value={formData.keyword}
                  onChange={(e) => handleInputChange("keyword", e.target.value)}
                  placeholder="e.g., authentication failure"
                  className="modern-input"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="threshold" className="text-sm font-medium">
                  Threshold *
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  value={formData.threshold}
                  onChange={(e) => handleInputChange("threshold", Number.parseInt(e.target.value))}
                  placeholder="Number of occurrences"
                  className="modern-input"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="interval" className="text-sm font-medium">
                  Time Interval *
                </Label>
                <Select value={formData.interval} onValueChange={(value) => handleInputChange("interval", value)}>
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select time interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 minute">1 minute</SelectItem>
                    <SelectItem value="5 minutes">5 minutes</SelectItem>
                    <SelectItem value="10 minutes">10 minutes</SelectItem>
                    <SelectItem value="30 minutes">30 minutes</SelectItem>
                    <SelectItem value="1 hour">1 hour</SelectItem>
                    <SelectItem value="6 hours">6 hours</SelectItem>
                    <SelectItem value="24 hours">24 hours</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe what this rule detects and why it's important..."
                rows={4}
                className="modern-input resize-none"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="modern-button w-full py-3">
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating Rule..." : "Create Correlation Rule"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Rule Configuration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Rule Name</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A descriptive name for your correlation rule (e.g., "Brute Force Attack Detection")
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Keyword</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Text pattern to search for in log messages (e.g., "authentication failure", "login failed")
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Threshold</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Number of matching events required to trigger the correlation (e.g., 5 failed logins)
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Time Interval</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Time window to count events within (e.g., 5 minutes means 5 events in 5 minutes)
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Severity</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Impact level of the correlation when triggered (affects alerting and prioritization)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
