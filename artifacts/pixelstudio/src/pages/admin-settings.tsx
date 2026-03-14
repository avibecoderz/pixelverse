import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, KeyRound, Mail, User, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { changePassword } from "@/lib/api";

export default function AdminSettings() {
  const { toast } = useToast();

  // ─── Profile (display only — sourced from localStorage set at login) ───────
  const storedName  = localStorage.getItem("user_name") || "Admin";
  const storedEmail = localStorage.getItem("user_email") || "";

  // ─── Change password ──────────────────────────────────────────────────────
  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw]       = useState(false);
  const [pwMsg, setPwMsg]             = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    // Client-side validation before hitting the API
    if (!currentPw.trim()) {
      setPwMsg({ type: "error", text: "Current password is required." });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPw === currentPw) {
      setPwMsg({ type: "error", text: "New password must be different from the current one." });
      return;
    }

    setSavingPw(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwMsg({ type: "success", text: "Password changed successfully. Use the new password on your next login." });
      toast({ title: "Password updated", description: "Your new password is now active." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password. Please try again.";
      setPwMsg({ type: "error", text: msg });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-display font-bold tracking-tight">Account Settings</h1>
        </div>
        <p className="text-muted-foreground mt-1">View your admin profile and update your password.</p>
      </div>

      {/* ── Profile Card (read-only display) ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Admin Profile</CardTitle>
              <CardDescription>Your account information as registered in the system.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-primary flex items-center justify-center text-2xl font-bold border border-primary/10 shadow-sm">
              {storedName.charAt(0).toUpperCase() || "A"}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{storedName}</p>
              {storedEmail && (
                <p className="text-sm text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {storedEmail}
                </p>
              )}
            </div>
          </div>
          <div className="bg-slate-50 border border-border/50 rounded-xl p-4 text-sm text-muted-foreground flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>To update your name or email, contact a system administrator. Profile changes must be made directly in the database for security.</span>
          </div>
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
              <CardDescription>Update your admin login password. You must know your current password to change it.</CardDescription>
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

            {/* Password strength indicator */}
            {newPw && (
              <div className="flex gap-1.5 items-center">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                    newPw.length >= i * 3
                      ? i <= 1 ? "bg-rose-400" : i <= 2 ? "bg-amber-400" : i <= 3 ? "bg-blue-400" : "bg-emerald-500"
                      : "bg-slate-200"
                  }`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1 shrink-0">
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
              {savingPw
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
                : <><KeyRound className="w-4 h-4" />Change Password</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Security tip ── */}
      <Card className="border-border/60 shadow-sm bg-slate-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Security tip</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Use a strong, unique password that you do not use on other websites.
                Staff members have separate accounts — do not share your admin credentials with anyone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
