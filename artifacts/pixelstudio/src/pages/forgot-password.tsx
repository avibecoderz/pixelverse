import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { requestPasswordReset, verifyPasswordResetOtp, resetPassword } from "@/lib/api";
import { Loader2, ArrowLeft, Mail, KeyRound, Lock } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const resetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type Step = "email" | "otp" | "reset";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    setLoading(true);
    try {
      await requestPasswordReset(values.email);
      setEmail(values.email);
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: "Please check your email for the 6-digit verification code.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    setLoading(true);
    try {
      const response = await verifyPasswordResetOtp(email, values.otp);
      setResetToken(response.resetToken);
      setStep("reset");
      toast({
        title: "OTP Verified",
        description: "You can now set your new password.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Invalid or expired OTP.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (values: z.infer<typeof resetSchema>) => {
    setLoading(true);
    try {
      await resetPassword(email, resetToken, values.password);
      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => step === "email" ? setLocation("/login") : setStep(step === "otp" ? "email" : "otp")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          </div>
          <CardDescription>
            {step === "email" && "Enter your email address to receive a reset code."}
            {step === "otp" && `Enter the 6-digit code sent to ${email}`}
            {step === "reset" && "Create a new secure password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="admin@example.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Code
                </Button>
              </form>
            </Form>
          )}

          {step === "otp" && (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-6">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel className="mb-2 self-start">Verification Code</FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify OTP
                </Button>
                <div className="text-center">
                  <Button 
                    variant="link" 
                    size="sm" 
                    type="button"
                    onClick={() => handleEmailSubmit({ email })}
                    disabled={loading}
                  >
                    Didn't receive a code? Resend
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === "reset" && (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" type="password" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" type="password" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <Button variant="link" size="sm" onClick={() => setLocation("/login")}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
