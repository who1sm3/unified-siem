import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { BarChart3, FileText, AlertTriangle, Settings, Ticket, Plus, Users } from "lucide-react"
import Link from "next/link"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Logs",
    url: "/logs",
    icon: FileText,
  },
  {
    title: "Correlated Alerts",
    url: "/correlated-alerts",
    icon: AlertTriangle,
  },
  {
    title: "Correlation Rules",
    url: "/correlation-rules",
    icon: Settings,
  },
  {
    title: "Tickets",
    url: "/tickets",
    icon: Ticket,
  },
  {
    title: "Create Ticket",
    url: "/create-ticket",
    icon: Plus,
  },
  {
    title: "Analysts",
    url: "/analysts",
    icon: Users,
  },
]

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          {/* Logo Placeholder */}
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-1 ring-border/20">
            <img src="/unified.png" alt="Company Logo" className="h-7 w-7 object-contain" />
            <span className="text-primary-foreground font-bold text-lg hidden">U</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-sidebar-foreground leading-tight tracking-tight">UNIFIED SIEM</h2>
            <p className="text-xs text-sidebar-foreground/70 leading-none">Security Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-4 px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="py-3 px-4 hover:bg-sidebar-accent transition-all duration-200 rounded-xl group border border-transparent hover:border-sidebar-border/20"
                  >
                    <Link href={item.url} className="flex items-center gap-3 text-sidebar-foreground">
                      <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
