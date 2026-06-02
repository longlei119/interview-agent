import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  // 同 login：查库判断登录态，避免 cookie 残留导致的重定向死循环。
  const user = await getCurrentUser();
  if (user) redirect("/practice");
  return <AuthForm mode="register" />;
}
