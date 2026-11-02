
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { authClient } from "../../lib/auth-client";
import styles from "./AuthForm.module.css";

export default function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(
          authError.message || "Unable to create your account."
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="signup-name" className={styles.label}>
          Full name
        </label>

        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="signup-email" className={styles.label}>
          Email address
        </label>

        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={styles.input}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="signup-password" className={styles.label}>
          Password
        </label>

        <input
          id="signup-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          minLength={8}
          required
        />
      </div>

      <div className={styles.field}>
        <label
          htmlFor="signup-confirm-password"
          className={styles.label}
        >
          Confirm password
        </label>

        <input
          id="signup-confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          className={styles.input}
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(event.target.value)
          }
          disabled={loading}
          required
        />

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) =>
              setShowPassword(event.target.checked)
            }
          />
          Show passwords
        </label>
      </div>

      <button
        type="submit"
        className={styles.button}
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
