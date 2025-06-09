import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Unified SIEM Dashboard",
  description: "Advanced Security Information and Event Management System",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="-ml-1 hover:bg-accent transition-colors rounded-xl p-2" />
                  <div className="flex items-center gap-4">
                    {/* Logo Placeholder */}
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-1 ring-border/20">
                      <img
                        src="/unified.png"
                        alt="Company Logo"
                        className="h-7 w-7 object-contain"
                      />
                      <span className="text-primary-foreground font-bold text-lg hidden">U</span>
                    </div>
                    <div className="flex flex-col">
                      <h1 className="text-xl font-bold text-foreground leading-tight tracking-tight">
                        UNIFIED SIEM DASHBOARD
                      </h1>
                      <p className="text-xs text-muted-foreground leading-none">
                        Security Information & Event Management
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto bg-background min-h-screen">{children}</main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
