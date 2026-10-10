import AuthShell from "@/components/auth/auth-shell";
import RequestRecoveryForm from "@/components/auth/request-recovery-form";

export const metadata = { title: "Reset password" };

export default function RecoveryPage() {
  return <AuthShell statement="Account recovery." support="Your saved work stays with your account.">
    <RequestRecoveryForm />
  </AuthShell>;
}
