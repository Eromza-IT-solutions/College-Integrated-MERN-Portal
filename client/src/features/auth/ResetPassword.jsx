import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { resetPassword } from "../../services/authService";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Enter a new password.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      setMessage(await resetPassword({ token, password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = "flex h-12 items-center gap-3 rounded-lg border border-slate-300 px-4 focus-within:border-[#8f0014]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#14234b] px-4 py-16 font-['Poppins',sans-serif]">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-[#14234b]">Reset password</h1>

        {!token ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            This reset link is incomplete. Please request a new one.{" "}
            <Link to="/forgot-password" className="font-semibold underline">
              Forgot password
            </Link>
          </p>
        ) : message ? (
          <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <p className="text-sm text-slate-500">
              Use 12-128 characters, mixing letters, numbers and symbols.
            </p>
            <div className={field}>
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                aria-label="New password"
                placeholder="New password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-full w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className={field}>
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                aria-label="Confirm new password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-full w-full bg-transparent text-sm outline-none"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#8f0014] text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Change password
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8f0014] hover:underline">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </section>
    </main>
  );
}
