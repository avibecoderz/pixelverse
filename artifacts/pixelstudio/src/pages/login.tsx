import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera, ShieldCheck, UserCircle, CheckCircle, Eye, EyeOff,
  ImageIcon, CreditCard, AlertCircle, Mail, ArrowLeft, KeyRound, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { login as apiLogin, getToken } from "@/lib/api";

type Role = "admin" | "staff";
type ForgotStep = "email" | "otp" | "newpw";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ─── Login state ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<Role>("admin");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading]       = useState(false);

  // ─── Forgot-password state ────────────────────────────────────────────────
  const [forgotMode, setForgotMode]       = useState(false);
  const [forgotStep, setForgotStep]       = useState<ForgotStep>("email");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [otpGenerated, setOtpGenerated]   = useState("");
  const [otpInput, setOtpInput]           = useState("");
  const [newPw, setNewPw]                 = useState("");
  const [confirmPw, setConfirmPw]         = useState("");
  const [showNewPw, setShowNewPw]         = useState(false);
  const [forgotError, setForgotError]     = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = getToken();
    const role  = localStorage.getItem("role");
    if (token && role === "admin") setLocation("/admin");
    if (token && role === "staff") setLocation("/staff");
  }, [setLocation]);

  const handleTabChange = (tab: Role) => {
    setActiveTab(tab);
    setEmail(""); setPassword(""); setLoginError("");
    setForgotMode(false); resetForgot();
  };

  const resetForgot = () => {
    setForgotStep("email");
    setRecoveryEmail(""); setOtpGenerated(""); setOtpInput("");
    setNewPw(""); setConfirmPw(""); setForgotError("");
  };

  // ─── Login submit ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); setLoading(true);
    try {
      const { user } = await apiLogin(email.trim(), password, activeTab);
      // Store role and display name for the app layout to use
      localStorage.setItem("role",      user.role);
      localStorage.setItem("user_name", user.name);
      localStorage.setItem("user_id",   user.id);
      toast({ title: "Login successful", description: `Welcome back, ${user.name}!` });
      setLocation(user.role === "admin" ? "/admin" : "/staff");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setLoginError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Fill demo credentials from the seed data
  const fillDemo = () => {
    if (activeTab === "admin") {
      setEmail("admin@pixelstudio.com");
      setPassword("admin123");
    } else {
      // Use the first staff member created by the seed script, if any.
      // Staff accounts are created via the Admin → Manage Staff page.
      setEmail("staff@pixelstudio.com");
      setPassword("staff123");
    }
    setLoginError("");
  };

  // ─── Forgot-password steps (UI demo — no real email service) ─────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(""); setForgotLoading(true);
    await new Promise(r => setTimeout(r, 800));
    if (!recoveryEmail.trim() || !recoveryEmail.includes("@")) {
      setForgotError("Please enter a valid email address.");
    } else {
      const otp = generateOtp();
      setOtpGenerated(otp);
      setForgotStep("otp");
    }
    setForgotLoading(false);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (otpInput.trim() !== otpGenerated) {
      setForgotError("Invalid code. Please check the code shown above.");
    } else {
      setForgotStep("newpw");
    }
  };

  const handleNewPwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (newPw.length < 6) { setForgotError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setForgotError("Passwords do not match."); return; }
    // In a real implementation this would call a password-reset API endpoint.
    // For this demo, we just show a success message.
    toast({ title: "Password reset!", description: "Contact your system administrator to reset your password." });
    setForgotMode(false);
    resetForgot();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-black items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent z-0" />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay z-0" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative z-10 max-w-lg text-white">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-primary/20 p-3 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-primary/30 backdrop-blur-sm">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight">PixelStudio</h1>
          </div>
          <h2 className="text-5xl font-display font-bold leading-tight mb-8">Elevate your studio management.</h2>
          <div className="space-y-5 mb-12">
            {["Streamlined client galleries and instant delivery", "Automated invoicing and payment tracking", "Seamless staff and photographer coordination"].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-lg text-slate-300">
                <CheckCircle className="w-6 h-6 text-primary shrink-0" /><span>{f}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
            <div className="flex items-center gap-6 relative z-10">
              <div>
                <div className="text-4xl font-display font-bold text-white mb-1">1,248</div>
                <div className="text-sm font-medium text-slate-400 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Galleries Delivered</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-4xl font-display font-bold text-white mb-1">₦42M</div>
                <div className="text-sm font-medium text-slate-400 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Monthly Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-indigo-600 lg:hidden" />
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 lg:hidden">
            <div className="bg-primary p-2 rounded-xl text-white"><Camera className="w-6 h-6" /></div>
            <h1 className="text-2xl font-display font-bold text-slate-900">PixelStudio</h1>
          </div>

          {!forgotMode ? (
            <>
              <div>
                <h2 className="text-4xl font-bold font-display tracking-tight text-slate-900">Sign in</h2>
                <p className="text-slate-500 mt-2">Access your studio dashboard</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl">
                {([{ role: "admin" as Role, label: "Admin Login", icon: ShieldCheck }, { role: "staff" as Role, label: "Staff Login", icon: UserCircle }]).map(({ role, label, icon: Icon }) => (
                  <button key={role} type="button" onClick={() => handleTabChange(role)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === role ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>

              {/* Role badge */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${activeTab === "admin" ? "bg-indigo-50 border-indigo-100" : "bg-violet-50 border-violet-100"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "admin" ? "bg-indigo-100 text-indigo-600" : "bg-violet-100 text-violet-600"}`}>
                  {activeTab === "admin" ? <ShieldCheck className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${activeTab === "admin" ? "text-indigo-800" : "text-violet-800"}`}>{activeTab === "admin" ? "Studio Admin" : "Staff / Photographer"}</p>
                  <p className={`text-xs mt-0.5 ${activeTab === "admin" ? "text-indigo-600" : "text-violet-600"}`}>{activeTab === "admin" ? "Full access — manage staff, payments & settings" : "Upload photos & manage your clients"}</p>
                </div>
                <button type="button" onClick={fillDemo} className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${activeTab === "admin" ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "bg-violet-100 text-violet-700 hover:bg-violet-200"}`}>
                  Fill Demo
                </button>
              </div>

              {/* Login form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={activeTab === "admin" ? "admin@pixelstudio.ng" : "staff@pixelstudio.ng"}
                      value={email}
                      onChange={e => { setEmail(e.target.value); setLoginError(""); }}
                      className="h-12 text-base pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setLoginError(""); }} className="h-12 text-base pr-12" autoComplete="current-password" required />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {activeTab === "admin" && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => { setForgotMode(true); resetForgot(); }} className="text-xs font-semibold text-primary hover:underline mt-1">
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
                {loginError && (
                  <div className="flex items-center gap-2.5 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />{loginError}
                  </div>
                )}
                <Button type="submit" size="lg" disabled={loading} className="w-full h-12 text-base font-bold shadow-md">
                  {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</span> : "Sign In"}
                </Button>
                <p className="text-center text-xs text-slate-400">
                  Demo — {activeTab === "admin" ? "admin@pixelstudio.com / admin123" : "Create a staff account first via Admin → Manage Staff"}
                </p>
              </form>
            </>
          ) : (
            /* ── Forgot Password Flow ── */
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setForgotMode(false); resetForgot(); }} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-3xl font-bold font-display text-slate-900">
                    {forgotStep === "email" ? "Forgot Password" : forgotStep === "otp" ? "Enter OTP Code" : "Set New Password"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-0.5">
                    {forgotStep === "email" ? "Enter your recovery email to receive an OTP" : forgotStep === "otp" ? "Check the code shown below and enter it" : "Choose a strong new password"}
                  </p>
                </div>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {(["email", "otp", "newpw"] as ForgotStep[]).map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${forgotStep === step ? "bg-primary text-white shadow-md shadow-primary/30" : ["email", "otp", "newpw"].indexOf(forgotStep) > i ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {["email", "otp", "newpw"].indexOf(forgotStep) > i ? "✓" : i + 1}
                    </div>
                    {i < 2 && <div className={`flex-1 h-0.5 w-8 rounded ${["email", "otp", "newpw"].indexOf(forgotStep) > i ? "bg-emerald-400" : "bg-slate-200"}`} />}
                  </div>
                ))}
                <span className="ml-2 text-xs text-slate-400 font-medium">
                  {forgotStep === "email" ? "Step 1 of 3" : forgotStep === "otp" ? "Step 2 of 3" : "Step 3 of 3"}
                </span>
              </div>

              {/* Step 1 — Email */}
              {forgotStep === "email" && (
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Recovery Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <Input type="email" placeholder="admin@pixelstudio.ng" value={recoveryEmail} onChange={e => { setRecoveryEmail(e.target.value); setForgotError(""); }} className="h-12 pl-10 text-base" required />
                    </div>
                    <p className="text-xs text-slate-400">Enter the email address linked to your admin account.</p>
                  </div>
                  {forgotError && <div className="flex items-center gap-2.5 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3.5"><AlertCircle className="w-4 h-4 shrink-0" />{forgotError}</div>}
                  <Button type="submit" size="lg" disabled={forgotLoading} className="w-full h-12 font-bold">
                    {forgotLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</span> : <span className="flex items-center gap-2"><Mail className="w-4 h-4" />Send OTP Code</span>}
                  </Button>
                </form>
              )}

              {/* Step 2 — OTP */}
              {forgotStep === "otp" && (
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                      <RefreshCw className="w-4 h-4" /> Demo Mode — OTP Simulation
                    </div>
                    <p className="text-xs text-indigo-600">In production this would be sent to <span className="font-bold">{recoveryEmail}</span>. For this demo, your code is:</p>
                    <div className="text-center">
                      <span className="inline-block font-mono text-3xl font-bold tracking-[0.3em] text-indigo-700 bg-white border border-indigo-200 rounded-xl px-6 py-3 shadow-sm select-all">
                        {otpGenerated}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Enter OTP Code</Label>
                    <Input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={otpInput} onChange={e => { setOtpInput(e.target.value.replace(/\D/g, "")); setForgotError(""); }} className="h-12 text-center text-xl font-mono tracking-widest" required />
                  </div>
                  {forgotError && <div className="flex items-center gap-2.5 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3.5"><AlertCircle className="w-4 h-4 shrink-0" />{forgotError}</div>}
                  <Button type="submit" size="lg" className="w-full h-12 font-bold">Verify Code</Button>
                </form>
              )}

              {/* Step 3 — New Password */}
              {forgotStep === "newpw" && (
                <form onSubmit={handleNewPwSubmit} className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-sm text-emerald-700 font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0" /> Identity verified! Contact your administrator with the new password below.
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">New Password</Label>
                    <div className="relative">
                      <Input type={showNewPw ? "text" : "password"} placeholder="Min 6 characters" value={newPw} onChange={e => { setNewPw(e.target.value); setForgotError(""); }} className="h-12 pr-12 text-base" required />
                      <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Confirm New Password</Label>
                    <Input type="password" placeholder="Repeat new password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setForgotError(""); }} className="h-12 text-base" required />
                  </div>
                  {forgotError && <div className="flex items-center gap-2.5 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3.5"><AlertCircle className="w-4 h-4 shrink-0" />{forgotError}</div>}
                  <Button type="submit" size="lg" className="w-full h-12 font-bold gap-2">
                    <KeyRound className="w-4 h-4" /> Confirm Reset
                  </Button>
                </form>
              )}
            </div>
          )}

          <p className="text-center text-sm text-slate-400">© {new Date().getFullYear()} PixelStudio SaaS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
