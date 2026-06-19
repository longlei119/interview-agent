import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/practice");
  return <ForgotPasswordForm />;
}
