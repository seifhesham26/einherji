"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  jobTitle: z.string().max(100).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const updateProfile = trpc.settings.updateProfile.useMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(registerData: RegisterInput) {
    setIsLoading(true);

    const { error } = await signUp.email({
      name: registerData.name,
      email: registerData.email,
      password: registerData.password,
    });

    if (error) {
      setIsLoading(false);
      toast.error(error.message ?? "Failed to create account");
      return;
    }

    // Session is active now — save job title as a fire-and-forget (non-critical)
    if (registerData.jobTitle) {
      updateProfile.mutate({
        name: registerData.name,
        jobTitle: registerData.jobTitle,
        linkedinUrl: "",
      });
    }

    setIsLoading(false);
    toast.success("Account created! Check your email to verify your address.");
    router.push("/verify-email");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">Start automating your job hunt today</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" type="text" placeholder="Your name" autoComplete="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">
              Job Title <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input id="jobTitle" type="text" placeholder="e.g. SWE" {...register("jobTitle")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 chars"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
