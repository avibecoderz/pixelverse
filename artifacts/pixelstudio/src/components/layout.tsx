import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  UserPlus, 
  Image as ImageIcon,
  LogOut,
  Camera,
  Menu
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem("role");
    if (!savedRole && !location.startsWith("/login") && !location.startsWith("/gallery")) {
      setLocation("/login");
    }
    setRole(savedRole);
  }, [location, setLocation]);

  // Don't wrap login or public gallery in standard layout
  if (location.startsWith("/login") || location.startsWith("/gallery") || location.includes("/invoice")) {
    return <>{children}</>;
  }

  if (!role) return null;

  const adminNav = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Manage Staff", url: "/admin/staff", icon: Users },
    { title: "All Payments", url: "/admin/payments", icon: CreditCard },
  ];

  const staffNav = [
    { title: "Dashboard", url: "/staff", icon: LayoutDashboard },
    { title: "New Client", url: "/staff/clients/new", icon: UserPlus },
    { title: "Client Records", url: "/staff/clients", icon: ImageIcon },
  ];

  const navItems = role === "admin" ? adminNav : staffNav;

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("user_name");
    setLocation("/login");
  };

  const userName = localStorage.getItem("user_name") || (role === "admin" ? "Admin User" : "Staff Member");

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full bg-slate-50/50">
        <Sidebar variant="inset" className="border-r border-border/40">
          <SidebarContent>
            <div className="flex h-16 items-center px-6 mb-4">
              <div className="flex items-center gap-2 font-display text-xl font-bold text-primary">
                <Camera className="w-6 h-6" />
                PixelStudio
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs tracking-wider uppercase opacity-60">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url}
                        className="py-5 transition-all"
                      >
                        <Link href={item.url} className="flex items-center gap-3 font-medium">
                          <item.icon className="w-5 h-5 opacity-70" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <h2 className="text-sm font-medium text-muted-foreground capitalize hidden sm:block">
                {role} Portal
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {userName.charAt(0)}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {userName}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
