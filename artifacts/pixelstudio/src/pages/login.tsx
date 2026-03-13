import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, ShieldCheck, UserCircle, CheckCircle, Eye, EyeOff, ImageIcon, CreditCard, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CREDENTIALS = {
  admin: { username: "admin01", password: "admin123", name: "Ngozi Adeyemi" },
  staff: { username: "staff01", password: "staff123", name: "Emeka Okafor" },
};

type Role = "admin" | "staff";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Role>("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "admin") setLocation("/admin");
    if (role === "staff") setLocation("/staff");
  }, [setLocation]);

  const handleTabChange = (tab: Role) => {
    setActiveTab(tab);
    setUsername("");
    setPassword("");
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise(r => setTimeout(r, 600)); // simulate auth delay

    const creds = CREDENTIALS[activeTab];
    if (username === creds.username && password === creds.password) {
      localStorage.setItem("role", activeTab);
      localStorage.setItem("user_name", creds.name);
      toast({ title: "Login successful", description: `Welcome back, ${creds.name}!` });
      setLocation(activeTab === "admin" ? "/admin" : "/staff");
    } else {
      setError("Incorrect username or password. Please try again.");
    }
    setLoading(false);
  };

  const fillDemo = () => {
    setUsername(CREDENTIALS[activeTab].username);
    setPassword(CREDENTIALS[activeTab].password);
    setError("");
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left — Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-black items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent z-0" />
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

      {/* Right — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-indigo-600 lg:hidden" />

        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 lg:hidden">
            <div className="bg-primary p-2 rounded-xl text-white">
              <Camera className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900">PixelStudio</h1>
          </div>

          <div>
            <h2 className="text-4xl font-bold font-display tracking-tight text-slate-900">Sign in</h2>
            <p className="text-slate-500 mt-2">Access your studio dashboard</p>
          </div>

          {/* Role tabs */}
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl">
            {([
              { role: "admin" as Role, label: "Admin", icon: ShieldCheck },
              { role: "staff" as Role, label: "Staff", icon: UserCircle },
            ]).map(({ role, label, icon: Icon }) => (
              <button
                key={role}
                type="button"
                onClick={() => handleTabChange(role)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                  ${activeTab === role
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label} Login
              </button>
            ))}
          </div>

          {/* Role badge */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${activeTab === "admin" ? "bg-indigo-50 border-indigo-100" : "bg-violet-50 border-violet-100"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "admin" ? "bg-indigo-100 text-indigo-600" : "bg-violet-100 text-violet-600"}`}>
              {activeTab === "admin" ? <ShieldCheck className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
            </div>
            <div>
              <p className={`text-sm font-bold ${activeTab === "admin" ? "text-indigo-800" : "text-violet-800"}`}>
                {activeTab === "admin" ? "Studio Admin" : "Staff / Photographer"}
              </p>
              <p className={`text-xs mt-0.5 ${activeTab === "admin" ? "text-indigo-600" : "text-violet-600"}`}>
                {activeTab === "admin" ? "Manage staff, payments & settings" : "Upload photos & manage clients"}
              </p>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${activeTab === "admin" ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "bg-violet-100 text-violet-700 hover:bg-violet-200"}`}
            >
              Fill Demo
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder={activeTab === "admin" ? "admin01" : "staff01"}
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                className="h-12 text-base border-slate-200 focus:border-primary"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  className="h-12 text-base border-slate-200 focus:border-primary pr-12"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-12 text-base font-bold shadow-md"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign In"}
            </Button>

            {/* Demo hint */}
            <p className="text-center text-xs text-slate-400">
              Demo credentials — {activeTab === "admin" ? "admin01 / admin123" : "staff01 / staff123"}
            </p>
          </form>

          <p className="text-center text-sm text-slate-400">
            © {new Date().getFullYear()} PixelStudio SaaS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
