import LoginForm from "../../../components/auth/LoginForm";

export const metadata = {
  title: "Sign in | Folivo",
};

export default function LoginPage() {
  return (
    <section className="rounded-2xl border border-border bg-card p-7 shadow-card sm:p-9">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to continue managing your finances.
        </p>
      </div>

      <LoginForm />
    </section>
  );
}