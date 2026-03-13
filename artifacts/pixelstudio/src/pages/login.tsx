import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Camera, ShieldCheck, UserCircle, CheckCircle, ChevronRight, Users, Image as ImageIcon, CreditCard } from "lucide-react";
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
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-black items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent z-0" />
        
        {/* landing page hero professional photography studio modern */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay z-0" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        
        <div className="relative z-10 max-w-lg text-white">
          <div className="flex items-center gap-3 mb-10">
            <div className="relative bg-primary/20 p-3 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-primary/30 backdrop-blur-sm">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight">PixelStudio</h1>
          </div>
          
          <h2 className="text-5xl font-display font-bold leading-tight mb-8">
            Elevate your studio management.
          </h2>
          
          <div className="space-y-5 mb-12">
            {[
              "Streamlined client galleries and instant delivery",
              "Automated invoicing and payment tracking",
              "Seamless staff and photographer coordination",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-lg text-slate-300">
                <CheckCircle className="w-6 h-6 text-primary shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Decorative stats card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
            <div className="flex items-center gap-6 relative z-10">
              <div>
                <div className="text-4xl font-display font-bold text-white mb-1">1,248</div>
                <div className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Galleries Delivered
                </div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-4xl font-display font-bold text-white mb-1">₦42M</div>
                <div className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Monthly Revenue
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-indigo-600 lg:hidden" />
        
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left space-y-3">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-8 lg:hidden">
              <div className="bg-primary p-2 rounded-xl text-white">
                <Camera className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-900">PixelStudio</h1>
            </div>
            
            <h2 className="text-4xl font-bold font-display tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-lg">Select a role to access the demonstration</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => handleLogin("admin", "Ngozi Adeyemi")}
              className="w-full group flex items-center justify-between p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/50 hover:bg-slate-50/50 transition-all duration-300 text-left hover:shadow-md"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Studio Admin</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Manage staff, revenue & settings</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
            
            <button 
              onClick={() => handleLogin("staff", "Emeka Okafor")}
              className="w-full group flex items-center justify-between p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/50 hover:bg-slate-50/50 transition-all duration-300 text-left hover:shadow-md"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-100 transition-colors">
                  <UserCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Staff / Photographer</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Upload photos & manage clients</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          </div>
          
          <div className="pt-8 flex flex-col items-center">
            <p className="text-center text-sm font-medium text-slate-400">
              © {new Date().getFullYear()} PixelStudio SaaS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
