"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-client";
import { resetPasswordSchema } from "./recovery.validators";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit({ password }: z.infer<typeof resetPasswordSchema>) {
    if (!token) return;
    setError(null);
    try {
      const result = await resetPassword({ token, newPassword: password });
      if (result.error) { setError("This reset link is invalid or expired. Request a new link."); return; }
      setComplete(true);
    } catch { setError("Password reset is unavailable. Try again later."); }
  }

  return <div className="w-full max-w-sm space-y-6">
    <h2 className="console-display text-2xl leading-tight">New password</h2>
    {complete ? <div className="space-y-4"><p role="status" className="text-sm text-muted-foreground">Password changed. Sign in again on your devices.</p>
      <Link href="/login" className="inline-block text-sm underline underline-offset-4">Sign in</Link></div>
    : !token || searchParams.has("error") ? <div className="space-y-4"><p role="alert" className="text-sm text-destructive">This reset link is missing or expired.</p>
      <Link href="/login/forgot-password" className="inline-block text-sm underline underline-offset-4">Request a new link</Link></div>
    : <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="new-password">New password</Label>
        <Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} {...register("password")} aria-invalid={!!errors.password} />
        {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5"><Label htmlFor="confirm-password">Confirm password</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
        {errors.confirmPassword && <p role="alert" className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      {error && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error}</p>
        <Link href="/login/forgot-password" className="text-sm underline underline-offset-4">Request a new link</Link></div>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />} Change password
      </Button>
    </form>}
  </div>;
}
