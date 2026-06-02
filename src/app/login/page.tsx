import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  // 用 getCurrentUser（查库）而非 getSession（只验签），
  // 避免 cookie 有效但用户已被删时与受保护页互相重定向死循环。
  const user = await getCurrentUser();
  if (user) redirect("/practice");
  return <AuthForm mode="login" />;
}
