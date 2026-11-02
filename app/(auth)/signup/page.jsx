import SignupForm from "../../../components/auth/SignupForm";

export const metadata = {
  title: "Create account | Folivo",
};

export default function SignupPage() {
  return (
    <section className="rounded-2xl border border-border bg-card p-7 shadow-card sm:p-9">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Start building a clearer picture of your finances.
        </p>
      </div>

      <SignupForm />
    </section>
  );
}