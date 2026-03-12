import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ShieldCheck, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "admin") setLocation("/admin");
    if (role === "staff") setLocation("/staff");
  }, [setLocation]);

  const handleLogin = (role: "admin" | "staff", name: string) => {
    localStorage.setItem("role", role);
    localStorage.setItem("user_name", name);
    
    toast({
      title: "Authentication Successful",
      description: `Logged in as ${role.toUpperCase()}`,
    });
    
    setLocation(role === "admin" ? "/admin" : "/staff");
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-primary/5 items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background z-0" />
        
        {/* landing page hero professional photography studio modern */}
        <div className="absolute inset-0 opacity-10 mix-blend-multiply z-0" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/30">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">PixelStudio</h1>
          </div>
          <h2 className="text-5xl font-display font-bold leading-tight mb-6 text-foreground">
            Manage your photography business with clarity.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A comprehensive dashboard for studio managers and staff to track clients, manage photo deliveries, and handle invoices seamlessly.
          </p>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
          </div>

          <Card className="border-border/60 shadow-lg shadow-black/5 bg-slate-50/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Demo Access</CardTitle>
              <CardDescription>
                This is a demonstration application. Choose a role below to access the different portals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => handleLogin("admin", "Admin Sarah")}
                className="w-full h-14 text-base font-semibold justify-start px-6 gap-4" 
                size="lg"
              >
                <ShieldCheck className="w-5 h-5 opacity-70" />
                Login as Studio Admin
              </Button>
              
              <Button 
                onClick={() => handleLogin("staff", "Photographer Mike")}
                variant="outline" 
                className="w-full h-14 text-base font-semibold justify-start px-6 gap-4 bg-white hover:bg-slate-50"
                size="lg"
              >
                <UserCircle className="w-5 h-5 text-primary opacity-70" />
                Login as Staff / Photographer
              </Button>
            </CardContent>
          </Card>
          
          <p className="text-center text-xs text-muted-foreground pt-8">
            © {new Date().getFullYear()} PixelStudio SaaS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
