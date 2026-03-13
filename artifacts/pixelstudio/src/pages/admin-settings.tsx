import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, KeyRound, Mail, User, ShieldCheck, AlertCircle, CheckCircle2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminAccountApi } from "@/lib/mock-db";

export default function AdminSettings() {
  const { toast } = useToast();
  const account = adminAccountApi.get();

  // ─── Profile ──────────────────────────────────────────────────────────────
  const [name, setName]   = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!name.trim()) { setProfileMsg({ type: "error", text: "Name cannot be empty." }); return; }
    if (!email.trim() || !email.includes("@")) { setProfileMsg({ type: "error", text: "Enter a valid email address." }); return; }
    setSavingProfile(true);
    await new Promise(r => setTimeout(r, 500));
    adminAccountApi.update({ name: name.trim(), email: email.trim() });
    localStorage.setItem("user_name", name.trim());
    setProfileMsg({ type: "success", text: "Profile updated successfully." });
    toast({ title: "Profile saved", description: "Your name and recovery email have been updated." });
    setSavingProfile(false);
  };

  // ─── Change password ──────────────────────────────────────────────────────
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    const latest = adminAccountApi.get();
    if (currentPw !== latest.password) { setPwMsg({ type: "error", text: "Current password is incorrect." }); return; }
    if (newPw.length < 6) { setPwMsg({ type: "error", text: "New password must be at least 6 characters." }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "error", text: "Passwords do not match." }); return; }
    if (newPw === currentPw) { setPwMsg({ type: "error", text: "New password must be different from the current one." }); return; }
    setSavingPw(true);
    await new Promise(r => setTimeout(r, 600));
    adminAccountApi.update({ password: newPw });
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwMsg({ type: "success", text: "Password changed successfully." });
    toast({ title: "Password updated", description: "Your new password is active." });
    setSavingPw(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-display font-bold tracking-tight">Account Settings</h1>
        </div>
        <p className="text-muted-foreground mt-1">Manage your admin profile, recovery email, and password.</p>
      </div>

      {/* ── Profile Card ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Profile & Recovery Email</CardTitle>
              <CardDescription>Your name and the Gmail used to recover your password.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-primary flex items-center justify-center text-2xl font-bold border border-primary/10 shadow-sm">
                {name.charAt(0) || "A"}
              </div>
              <div>
                <p className="font-semibold text-foreground">{name || "Admin"}</p>
                <p className="text-sm text-muted-foreground font-mono">{adminAccountApi.get().username}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => { setName(e.target.value); setProfileMsg(null); }}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Recovery Email (Gmail)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setProfileMsg(null); }}
                  className="pl-9 h-11"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">This email is used to reset your password via the "Forgot Password" flow on the login page.</p>
            </div>

            {profileMsg && (
              <div className={`flex items-center gap-2.5 text-sm rounded-xl p-3.5 border ${profileMsg.type === "success" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-600 bg-rose-50 border-rose-200"}`}>
                {profileMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {profileMsg.text}
              </div>
            )}

            <Button type="submit" disabled={savingProfile} className="gap-2 shadow-sm">
              {savingProfile ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span> : <><Save className="w-4 h-4" />Save Profile</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Change Password Card ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Change Password</CardTitle>
              <CardDescription>Update your admin login password at any time.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Your current password"
                  value={currentPw}
                  onChange={e => { setCurrentPw(e.target.value); setPwMsg(null); }}
                  className="h-11 pr-11"
                  required
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwMsg(null); }}
                    className="h-11 pr-11"
                    required
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat password"
                    value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); setPwMsg(null); }}
                    className="h-11 pr-11"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Strength hint */}
            {newPw && (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                    newPw.length >= i * 3
                      ? i <= 1 ? "bg-rose-400" : i <= 2 ? "bg-amber-400" : i <= 3 ? "bg-blue-400" : "bg-emerald-500"
                      : "bg-slate-200"
                  }`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1 self-center">
                  {newPw.length < 6 ? "Too short" : newPw.length < 9 ? "Fair" : newPw.length < 12 ? "Good" : "Strong"}
                </span>
              </div>
            )}

            {pwMsg && (
              <div className={`flex items-center gap-2.5 text-sm rounded-xl p-3.5 border ${pwMsg.type === "success" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-600 bg-rose-50 border-rose-200"}`}>
                {pwMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {pwMsg.text}
              </div>
            )}

            <Button type="submit" disabled={savingPw} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
              {savingPw ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span> : <><KeyRound className="w-4 h-4" />Change Password</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Security info ── */}
      <Card className="border-border/60 shadow-sm bg-slate-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Security tip</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Keep your recovery email up to date — it's the only way to reset your admin password if you forget it.
                Use a strong, unique password and avoid sharing it with staff.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
