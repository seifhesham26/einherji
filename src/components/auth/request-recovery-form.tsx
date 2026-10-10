"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-client";
import { requestRecoverySchema } from "./recovery.validators";

export default function RequestRecoveryForm() {
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof requestRecoverySchema>>({ resolver: zodResolver(requestRecoverySchema) });

  async function onSubmit({ email }: z.infer<typeof requestRecoverySchema>) {
    setError(null);
    try {
      const result = await requestPasswordReset({ email, redirectTo: "/login/reset-password" });
      if (result.error) { setError("Recovery email is unavailable. Try again later."); return; }
      setComplete(true);
    } catch { setError("Recovery email is unavailable. Try again later."); }
  }

  return <div className="w-full max-w-sm space-y-6">
    <h2 className="console-display text-2xl leading-tight">Reset password</h2>
    {complete ? <p className="text-sm text-muted-foreground" role="status">If an account matches that email, check your inbox for a reset link.</p> : (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="recovery-email">Email</Label>
          <Input id="recovery-email" type="email" autoComplete="email" maxLength={254} {...register("email")} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />} Send reset link
        </Button>
      </form>
    )}
    <Link href="/login" className="inline-block text-sm underline underline-offset-4">Back to sign in</Link>
  </div>;
}
