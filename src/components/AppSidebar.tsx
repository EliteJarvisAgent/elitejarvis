import { Home, Users, LayoutDashboard, Activity, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Command Center", url: "/", icon: Home },
  { title: "Agents", url: "/agents", icon: Users },
  { title: "Task Board", url: "/tasks", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-primary/10 bg-transparent"
      style={{
        background: "linear-gradient(180deg, hsl(222 30% 5%) 0%, hsl(222 28% 7%) 50%, hsl(222 25% 6%) 100%)",
      }}
    >
      <SidebarContent className="pt-5">
        {/* Brand mark */}
        <div className={`flex items-center gap-2.5 px-4 pb-8 ${collapsed ? "justify-center" : ""}`}>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border border-primary/30"
            style={{
              background: "radial-gradient(circle at 40% 35%, hsl(185 90% 48% / 0.2), hsl(185 90% 48% / 0.05))",
              boxShadow: "0 0 20px hsl(185 90% 48% / 0.15), inset 0 0 10px hsl(185 90% 48% / 0.05)",
            }}
          >
            <Activity className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-mono-display font-bold text-sm tracking-[0.3em] text-primary/90">
              JARVIS
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {items.map((item) => {
                const isActive = item.url === "/" 
                  ? location.pathname === "/" 
                  : location.pathname.startsWith(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`group relative rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all duration-200 ${
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        activeClassName=""
                        style={isActive ? {
                          background: "linear-gradient(135deg, hsl(185 90% 48% / 0.1), hsl(185 90% 48% / 0.03))",
                          boxShadow: "0 0 16px hsl(185 90% 48% / 0.08), inset 0 0 0 1px hsl(185 90% 48% / 0.15)",
                        } : {}}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-primary"
                            style={{ boxShadow: "0 0 8px hsl(185 90% 48% / 0.5)" }}
                          />
                        )}
                        <item.icon className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? "text-primary drop-shadow-[0_0_6px_hsl(185_90%_48%_/_0.4)]" : ""
                        }`} />
                        {!collapsed && (
                          <span className="text-sm font-medium tracking-wide">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom section - system status */}
        {!collapsed && (
          <div className="mt-auto px-4 pb-4">
            <div className="rounded-lg p-3 border border-border/30"
              style={{
                background: "linear-gradient(135deg, hsl(222 25% 8%), hsl(222 25% 6%))",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
                  style={{ boxShadow: "0 0 6px hsl(160 70% 45% / 0.5)" }}
                />
                <span className="text-[10px] font-mono-display tracking-widest text-muted-foreground uppercase">
                  System Online
                </span>
              </div>
              <div className="flex gap-1">
                {[0.6, 0.8, 0.4, 0.9, 0.5, 0.7, 0.3].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-primary/20"
                    style={{
                      height: `${h * 16}px`,
                      background: `linear-gradient(to top, hsl(185 90% 48% / 0.3), hsl(185 90% 48% / 0.1))`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
