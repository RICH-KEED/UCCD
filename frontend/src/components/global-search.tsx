"use client"

import * as React from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  FileText,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { api } from "@/lib/api-client"
import type { Complaint, UserRole } from "@/types/complaint"
import { useAuth } from "@/hooks/use-auth"
import { useRouter, type RoutePath } from "@/hooks/use-router"

const OPEN_GLOBAL_SEARCH_EVENT = "uccd:open-global-search"

export function openGlobalSearch() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(OPEN_GLOBAL_SEARCH_EVENT))
}

type SearchPage = {
  label: string
  route: RoutePath
  icon: React.ElementType
  roles: UserRole[]
  keywords: string
}

const SEARCH_PAGES: SearchPage[] = [
  { label: "Dashboard", route: "dashboard", icon: LayoutDashboard, roles: ["AGENT", "SUPERVISOR", "COMPLIANCE"], keywords: "home kpis overview" },
  { label: "My Queue", route: "complaints", icon: ListTodo, roles: ["AGENT"], keywords: "complaints queue tickets cases" },
  { label: "All Complaints", route: "complaints", icon: ListTodo, roles: ["SUPERVISOR"], keywords: "complaints queue tickets cases" },
  { label: "AI Drafts", route: "ai-drafts", icon: Sparkles, roles: ["AGENT"], keywords: "draft responses ai replies" },
  { label: "360 View", route: "360-view", icon: Search, roles: ["AGENT"], keywords: "customer history profile" },
  { label: "Escalations", route: "escalations", icon: ShieldAlert, roles: ["SUPERVISOR"], keywords: "escalated cases risk" },
  { label: "SLA Breaches", route: "sla-breaches", icon: AlertTriangle, roles: ["SUPERVISOR", "COMPLIANCE"], keywords: "sla breached risk deadlines" },
  { label: "Trends", route: "trends", icon: TrendingUp, roles: ["SUPERVISOR", "COMPLIANCE"], keywords: "analytics charts trend forecast" },
  { label: "Root Cause", route: "root-cause", icon: FileText, roles: ["SUPERVISOR", "COMPLIANCE"], keywords: "root cause analysis patterns" },
  { label: "Regulatory Reports", route: "regulatory", icon: FileText, roles: ["COMPLIANCE"], keywords: "rbi compliance regulatory reports" },
  { label: "Settings", route: "settings", icon: Settings, roles: ["AGENT", "SUPERVISOR", "COMPLIANCE"], keywords: "account personalization theme font logout preferences" },
]

function complaintSearchValue(complaint: Complaint) {
  return [
    complaint.id,
    complaint.customer_id,
    complaint.customer_name,
    complaint.customer_email,
    complaint.customer_phone,
    complaint.account_number,
    complaint.complaint_type,
    complaint.product_code,
    complaint.channel,
    complaint.status,
    complaint.sla_tier,
    complaint.regulatory_obligation,
    complaint.root_cause,
    complaint.raw_text,
    complaint.ai_draft,
  ].filter(Boolean).join(" ")
}

export function GlobalSearch({ triggerClassName }: { triggerClassName?: string }) {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [open, setOpen] = React.useState(false)
  const [complaints, setComplaints] = React.useState<Complaint[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  const role = user?.role ?? "AGENT"
  const pages = React.useMemo(() => SEARCH_PAGES.filter((page) => page.roles.includes(role)), [role])

  React.useEffect(() => {
    const openSearch = () => setOpen(true)
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, openSearch)
    window.addEventListener("keydown", down)
    return () => {
      window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, openSearch)
      window.removeEventListener("keydown", down)
    }
  }, [])

  React.useEffect(() => {
    if (!open || loaded || loading) return
    setLoading(true)
    api.listComplaints({ limit: 100 })
      .then((response) => {
        setComplaints(response.complaints || [])
        setLoaded(true)
      })
      .catch(() => {
        setComplaints([])
        setLoaded(true)
      })
      .finally(() => setLoading(false))
  }, [loaded, loading, open])

  const openPage = (route: RoutePath) => {
    setOpen(false)
    navigate(route)
  }

  const openComplaint = (id: string) => {
    setOpen(false)
    navigate("complaint-detail", { id })
  }

  const escalations = complaints.filter((complaint) => complaint.status === "escalated")
  const drafts = complaints.filter((complaint) => complaint.ai_draft)
  const regulatory = complaints.filter((complaint) => complaint.regulatory_flag)
  const slaBreaches = complaints.filter((complaint) => complaint.sla_breached)

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <span className="flex grow items-center gap-2 min-w-0">
          <Search aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-muted-foreground/70">Search anything...</span>
        </span>
        <kbd className="ml-3 hidden h-5 items-center rounded border bg-background px-1 text-[10px] font-medium text-muted-foreground/70 md:inline-flex">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search pages, complaints, drafts, and table entries."
        className="max-w-2xl"
      >
        <CommandInput placeholder="Search pages, customers, IDs, issues..." />
        <CommandList className="max-h-[520px]">
          <CommandEmpty>No matching page or record found.</CommandEmpty>

          <CommandGroup heading="Pages">
            {pages.map((page) => {
              const Icon = page.icon
              return (
                <CommandItem
                  key={page.route}
                  value={`${page.label} ${page.keywords}`}
                  onSelect={() => openPage(page.route)}
                >
                  <Icon aria-hidden="true" className="opacity-70" />
                  <span>{page.label}</span>
                  <CommandShortcut><ArrowUpRight className="h-3.5 w-3.5" /></CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Complaints">
            {loading && (
              <CommandItem disabled value="loading">
                <Loader2 aria-hidden="true" className="animate-spin opacity-70" />
                <span>Loading records...</span>
              </CommandItem>
            )}
            {complaints.slice(0, 50).map((complaint) => (
              <CommandItem
                key={complaint.id}
                value={complaintSearchValue(complaint)}
                onSelect={() => openComplaint(complaint.id)}
              >
                <ListTodo aria-hidden="true" className="opacity-70" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {complaint.customer_name || complaint.customer_id} · {complaint.id.slice(0, 8)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {complaint.complaint_type || complaint.product_code || complaint.channel} · {complaint.raw_text}
                  </div>
                </div>
                <CommandShortcut>{complaint.status}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          {drafts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="AI Drafts">
                {drafts.slice(0, 20).map((complaint) => (
                  <CommandItem
                    key={`draft-${complaint.id}`}
                    value={`draft ${complaintSearchValue(complaint)}`}
                    onSelect={() => openComplaint(complaint.id)}
                  >
                    <Sparkles aria-hidden="true" className="opacity-70" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{complaint.customer_name || complaint.customer_id}</div>
                      <div className="truncate text-xs text-muted-foreground">{complaint.ai_draft}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {(role === "SUPERVISOR" || role === "COMPLIANCE") && (escalations.length > 0 || slaBreaches.length > 0 || regulatory.length > 0) && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Priority Entries">
                {escalations.slice(0, 10).map((complaint) => (
                  <CommandItem key={`esc-${complaint.id}`} value={`escalation ${complaintSearchValue(complaint)}`} onSelect={() => openComplaint(complaint.id)}>
                    <ShieldAlert aria-hidden="true" className="opacity-70" />
                    <span className="truncate">Escalation · {complaint.customer_name || complaint.customer_id}</span>
                  </CommandItem>
                ))}
                {slaBreaches.slice(0, 10).map((complaint) => (
                  <CommandItem key={`sla-${complaint.id}`} value={`sla breach ${complaintSearchValue(complaint)}`} onSelect={() => openComplaint(complaint.id)}>
                    <AlertTriangle aria-hidden="true" className="opacity-70" />
                    <span className="truncate">SLA breach · {complaint.customer_name || complaint.customer_id}</span>
                  </CommandItem>
                ))}
                {regulatory.slice(0, 10).map((complaint) => (
                  <CommandItem key={`reg-${complaint.id}`} value={`regulatory ${complaintSearchValue(complaint)}`} onSelect={() => openComplaint(complaint.id)}>
                    <FileText aria-hidden="true" className="opacity-70" />
                    <span className="truncate">Regulatory · {complaint.regulatory_obligation || complaint.customer_id}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
