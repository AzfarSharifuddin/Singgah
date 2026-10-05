import { AuthForm } from "@/components/vendor-management/forms";
import { adminLogin } from "@/lib/admin/actions";
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ access?: string; invitation?: string }> }) {
  const params = await searchParams;
  return <div className="mx-auto max-w-md"><h1 className="font-serif text-4xl">Admin sign in</h1><p className="mb-7 mt-4 leading-7">Manage vendors and review business applications. Use your invited admin account.</p>
    {params.access === "denied" && <p role="alert" className="mb-6 rounded-xl bg-rembulan/40 p-4">This account does not have admin access. Contact Singgah to check your invitation.</p>}
    {params.invitation === "retry" && <p role="alert" className="mb-6 rounded-xl bg-rembulan/40 p-4">The invitation could not be verified. Sign in if you already set a password, or request a fresh invitation.</p>}
    <AuthForm action={adminLogin} registration={false} />
  </div>;
}
