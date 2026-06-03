import { Home, Map, FileWarning, BarChart3, Newspaper, Phone, Shield } from "lucide-react";
import { NavLink } from "@/Components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/Components/ui/sidebar";

const menuItems = [
  { title: "Beranda", url: "/", icon: Home },
  { title: "Peta Kejadian", url: "/webgis", icon: Map },
  { title: "Laporkan", url: "/report", icon: FileWarning },
  { title: "Statistik", url: "/statistics", icon: BarChart3 },
  { title: "Berita", url: "/news", icon: Newspaper },
  { title: "Kontak Darurat", url: "/emergency", icon: Phone },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold text-sidebar-foreground tracking-tight"></h1>
              <p className="text-[11px] text-sidebar-muted"></p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-muted text-center">© 2026 </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
