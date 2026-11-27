import { Link } from "react-router-dom";
import { SearchX, ShieldAlert } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

function StatusPage({ icon: Icon, eyebrow, title, description, action }) {
  return (
    <main className="grid min-h-screen place-items-center bg-eromza-bg px-4 py-12">
      <Card className="w-full max-w-lg p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-eromza-accent">
          <Icon size={26} />
        </span>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-eromza-accent">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-eromza-text">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-eromza-muted">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>
      </Card>
    </main>
  );
}

export function UnauthorizedPage() {
  return (
    <StatusPage
      icon={ShieldAlert}
      eyebrow="Access denied"
      title="You do not have access to this page"
      description="Your account role does not include this workspace. Sign in with the correct role or return to your dashboard."
      action={
        <>
          <Button as={Link} to="/app">
            Go to dashboard
          </Button>
          <Button as={Link} to="/login" variant="secondary">
            Sign in
          </Button>
        </>
      }
    />
  );
}

export function NotFoundPage() {
  return (
    <StatusPage
      icon={SearchX}
      eyebrow="404"
      title="Page not found"
      description="The page you are looking for does not exist or may have moved."
      action={
        <Button as={Link} to="/">
          Back to home
        </Button>
      }
    />
  );
}
