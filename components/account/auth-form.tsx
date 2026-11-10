"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, passwordResetSchema, registerSchema } from "@/lib/validation/account";
import { rhfZodResolver } from "@/lib/validation/rhf-zod-resolver";

type LoginValues = { email: string; password: string };
type RegisterValues = { fullName: string; email: string; password: string; confirmPassword: string };
type ResetValues = { email: string };

function callbackUrl(nextPath: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

export function AuthForm({ mode, nextPath = "/account", notice = "" }: { mode: "login" | "register"; nextPath?: string; notice?: string }) {
  const router = useRouter();
  const [resetMode, setResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(notice);
  const [error, setError] = useState("");
  const loginForm = useForm<LoginValues>({ resolver: rhfZodResolver(loginSchema), mode: "onSubmit", defaultValues: { email: "", password: "" } });
  const registerForm = useForm<RegisterValues>({ resolver: rhfZodResolver(registerSchema), mode: "onSubmit", defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" } });
  const resetForm = useForm<ResetValues>({ resolver: rhfZodResolver(passwordResetSchema), mode: "onSubmit", defaultValues: { email: "" } });

  async function submitLogin(values: LoginValues) {
    setSubmitting(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword(values);
      if (signInError) throw new Error("We could not verify that email and password. Check them and try again.");
      router.replace(nextPath);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error && reason.message.startsWith("We could not") ? reason.message : "Customer sign in is unavailable until Supabase Auth is configured.");
    } finally { setSubmitting(false); }
  }

  async function submitRegistration(values: RegisterValues) {
    setSubmitting(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { full_name: values.fullName }, emailRedirectTo: callbackUrl(nextPath) },
      });
      if (signUpError) throw new Error(signUpError.message);
      if (data.session) {
        router.replace(nextPath);
        router.refresh();
      } else {
        setMessage("Your account is ready for verification. Check your inbox to confirm your email before signing in.");
      }
    } catch (reason) {
      setError(reason instanceof Error && reason.message.includes("configured") ? reason.message : reason instanceof Error ? reason.message : "We could not create the account. Try again.");
    } finally { setSubmitting(false); }
  }

  async function submitReset(values: ResetValues) {
    setSubmitting(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const destination = "/account/settings?password=reset";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo: callbackUrl(destination) });
      if (resetError) throw new Error("A password reset email could not be sent. Try again later.");
      setMessage("If an account exists for that address, a secure reset link is on its way.");
    } catch {
      setError("Password reset is unavailable until Supabase Auth is configured.");
    } finally { setSubmitting(false); }
  }

  const activeMode = mode === "register" ? "register" : resetMode ? "reset" : "login";

  return <main id="main-content" className="auth-page">
    <div className="auth-page__grain" aria-hidden="true" />
    <section className="auth-panel" aria-labelledby="auth-heading">
      <Link className="auth-panel__back" href="/discover"><ArrowLeft size={13} aria-hidden="true" /> RETURN TO THE COLLECTION</Link>
      <div className="auth-panel__mark" aria-hidden="true">V<span>/</span></div>
      <p className="eyebrow">VANTA / CUSTOMER ACCESS</p>
      <h1 id="auth-heading">{activeMode === "register" ? <>A place<br /><em>to keep.</em></> : activeMode === "reset" ? <>Find your<br /><em>way back.</em></> : <>Welcome<br /><em>back.</em></>}</h1>
      <p className="auth-panel__intro">{activeMode === "register" ? "Create an account for orders, saved forms, and the things you return to." : activeMode === "reset" ? "We will send a private link to reset your password." : "Your selections, orders, and configurations, held in one place."}</p>

      {activeMode === "register" ? <form className="auth-form" noValidate onSubmit={registerForm.handleSubmit(submitRegistration)}>
        <label><span>Full name</span><span className="auth-form__input"><UserRound size={14} aria-hidden="true" /><input autoComplete="name" {...registerForm.register("fullName")} aria-invalid={!!registerForm.formState.errors.fullName} placeholder="Avery Stone" /></span>{registerForm.formState.errors.fullName && <small role="alert">{registerForm.formState.errors.fullName.message}</small>}</label>
        <label><span>Email address</span><span className="auth-form__input"><Mail size={14} aria-hidden="true" /><input type="email" autoComplete="email" {...registerForm.register("email")} aria-invalid={!!registerForm.formState.errors.email} placeholder="you@example.com" /></span>{registerForm.formState.errors.email && <small role="alert">{registerForm.formState.errors.email.message}</small>}</label>
        <label><span>Password <small>8 characters minimum</small></span><span className="auth-form__input"><LockKeyhole size={14} aria-hidden="true" /><input type={showPassword ? "text" : "password"} autoComplete="new-password" {...registerForm.register("password")} aria-invalid={!!registerForm.formState.errors.password} placeholder="Create a password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></span>{registerForm.formState.errors.password && <small role="alert">{registerForm.formState.errors.password.message}</small>}</label>
        <label><span>Confirm password</span><span className="auth-form__input"><KeyRound size={14} aria-hidden="true" /><input type={showPassword ? "text" : "password"} autoComplete="new-password" {...registerForm.register("confirmPassword")} aria-invalid={!!registerForm.formState.errors.confirmPassword} placeholder="Repeat your password" /></span>{registerForm.formState.errors.confirmPassword && <small role="alert">{registerForm.formState.errors.confirmPassword.message}</small>}</label>
        <AuthFeedback message={message} error={error} />
        <button className="button button--primary auth-form__submit" type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Create account"}<ArrowRight size={15} aria-hidden="true" /></button>
      </form> : activeMode === "reset" ? <form className="auth-form" noValidate onSubmit={resetForm.handleSubmit(submitReset)}>
        <label><span>Email address</span><span className="auth-form__input"><Mail size={14} aria-hidden="true" /><input type="email" autoComplete="email" {...resetForm.register("email")} aria-invalid={!!resetForm.formState.errors.email} placeholder="you@example.com" /></span>{resetForm.formState.errors.email && <small role="alert">{resetForm.formState.errors.email.message}</small>}</label>
        <AuthFeedback message={message} error={error} />
        <button className="button button--primary auth-form__submit" type="submit" disabled={submitting}>{submitting ? "Sending secure link…" : "Send reset link"}<ArrowRight size={15} aria-hidden="true" /></button>
        <button className="auth-form__inline" type="button" onClick={() => { setResetMode(false); setMessage(""); setError(""); }}>Back to sign in</button>
      </form> : <form className="auth-form" noValidate onSubmit={loginForm.handleSubmit(submitLogin)}>
        <label><span>Email address</span><span className="auth-form__input"><Mail size={14} aria-hidden="true" /><input type="email" autoComplete="email" {...loginForm.register("email")} aria-invalid={!!loginForm.formState.errors.email} placeholder="you@example.com" /></span>{loginForm.formState.errors.email && <small role="alert">{loginForm.formState.errors.email.message}</small>}</label>
        <label><span>Password <button className="auth-form__inline" type="button" onClick={() => { setResetMode(true); setMessage(""); setError(""); }}>Forgot password?</button></span><span className="auth-form__input"><LockKeyhole size={14} aria-hidden="true" /><input type={showPassword ? "text" : "password"} autoComplete="current-password" {...loginForm.register("password")} aria-invalid={!!loginForm.formState.errors.password} placeholder="Your password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></span>{loginForm.formState.errors.password && <small role="alert">{loginForm.formState.errors.password.message}</small>}</label>
        <AuthFeedback message={message} error={error} />
        <button className="button button--primary auth-form__submit" type="submit" disabled={submitting}>{submitting ? "Opening your account…" : "Sign in"}<ArrowRight size={15} aria-hidden="true" /></button>
      </form>}
      <p className="auth-panel__switch">{mode === "register" ? <>Already with us? <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Sign in <ArrowRight size={12} aria-hidden="true" /></Link></> : <>New to VANTA? <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>Create an account <ArrowRight size={12} aria-hidden="true" /></Link></>}</p>
      <p className="auth-panel__privacy">Your account information is stored securely with Supabase Auth. We never store your password in VANTA.</p>
    </section>
    <aside className="auth-art" aria-hidden="true"><div className="auth-art__orbit auth-art__orbit--one" /><div className="auth-art__orbit auth-art__orbit--two" /><div className="auth-art__object"><span>V</span><i /></div><p>VANTA / OBJECTS WITH INTENTION</p><small>AUTHENTICATED ACCESS / 01</small></aside>
  </main>;
}

function AuthFeedback({ message, error }: { message: string; error: string }) {
  if (error) return <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>;
  if (message) return <p className="auth-feedback" role="status">{message}</p>;
  return null;
}
