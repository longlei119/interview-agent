import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/practice");
  const { reset } = await searchParams;
  return (
    <>
      {reset === "1" && (
        <div className="mx-auto mt-4 w-full max-w-sm rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          密码已重置，请用新密码登录
        </div>
      )}
      <AuthForm mode="login" />
    </>
  );
}
