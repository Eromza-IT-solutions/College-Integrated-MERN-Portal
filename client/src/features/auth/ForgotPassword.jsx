import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { forgotPassword } from "../../services/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter the email address of your account.");
      return;
    }
    try {
      setLoading(true);
      setMessage(await forgotPassword(email.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#14234b] px-4 py-16 font-['Poppins',sans-serif]">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-[#14234b]">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your account email and we will send you a link to reset your password.
        </p>

        {message ? (
          <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
              Email
            </label>
            <div className="flex h-12 items-center gap-3 rounded-lg border border-slate-300 px-4 focus-within:border-[#8f0014]">
              <Mail size={18} className="text-slate-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              Send reset link
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
