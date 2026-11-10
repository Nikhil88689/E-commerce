"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Check, LockKeyhole, MapPin, Plus, Trash2, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { accountAddressSchema, passwordChangeSchema, profileUpdateSchema } from "@/lib/validation/account";
import { rhfZodResolver } from "@/lib/validation/rhf-zod-resolver";
import type { z } from "zod";

type ProfileValues = z.infer<typeof profileUpdateSchema>;
type AddressValues = z.infer<typeof accountAddressSchema>;
type PasswordValues = z.infer<typeof passwordChangeSchema>;
type Address = AddressValues & { id: string };

export function AccountSettings({ passwordReset = false }: { passwordReset?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState(passwordReset ? "Enter a new password to finish your reset." : "");
  const [passwordError, setPasswordError] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);

  const profileForm = useForm<ProfileValues>({ resolver: rhfZodResolver(profileUpdateSchema), mode: "onSubmit", defaultValues: { fullName: "", email: "", phone: "", emailMarketing: false, orderUpdates: true } });
  const addressForm = useForm<AddressValues>({ resolver: rhfZodResolver(accountAddressSchema), mode: "onSubmit", defaultValues: { recipient: "", line1: "", line2: "", city: "", region: "", postalCode: "", countryCode: "US", isDefault: false } });
  const passwordForm = useForm<PasswordValues>({ resolver: rhfZodResolver(passwordChangeSchema), mode: "onSubmit", defaultValues: { password: "", confirmPassword: "" } });

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/account/profile", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("Profile settings could not be loaded."); return response.json() as Promise<ProfileValues>; }),
      fetch("/api/account/addresses", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("Address book could not be loaded."); return response.json() as Promise<{ addresses: Address[] }>; }),
    ]).then(([profile, addressData]) => {
      if (!active) return;
      profileForm.reset(profile);
      setAddresses(addressData.addresses);
    }).catch((reason: unknown) => {
      if (!active) return;
      const message = reason instanceof Error ? reason.message : "Account settings could not be loaded.";
      setProfileError(message);
      setAddressError(message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileForm]);

  async function saveProfile(values: ProfileValues) {
    setProfileError(""); setProfileMessage("");
    const response = await fetch("/api/account/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json() as { error?: string; emailChangePending?: boolean };
    if (!response.ok) { setProfileError(result.error ?? "Your settings could not be saved."); return; }
    setProfileMessage(result.emailChangePending ? "Profile saved. Confirm the change from the link sent to your new email address." : "Your profile and preferences are saved.");
  }

  async function saveAddress(values: AddressValues) {
    setAddressError(""); setAddressMessage("");
    const response = await fetch("/api/account/addresses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setAddressError(result.error ?? "The address could not be saved."); return; }
    const list = await fetch("/api/account/addresses", { cache: "no-store" }).then((res) => res.json()) as { addresses: Address[] };
    setAddresses(list.addresses);
    addressForm.reset({ recipient: "", line1: "", line2: "", city: "", region: "", postalCode: "", countryCode: "US", isDefault: false });
    setAddressMessage("Delivery address saved to your account.");
  }

  async function removeAddress(id: string) {
    setAddressError(""); setAddressMessage("");
    const response = await fetch("/api/account/addresses", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setAddressError(result.error ?? "The address could not be removed."); return; }
    setAddresses((current) => current.filter((address) => address.id !== id));
    setAddressMessage("Saved address removed.");
  }

  async function changePassword(values: PasswordValues) {
    setPasswordError(""); setPasswordMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw new Error(error.message);
      passwordForm.reset({ password: "", confirmPassword: "" });
      setPasswordMessage("Your password has been updated.");
    } catch (reason) {
      setPasswordError(reason instanceof Error && reason.message.includes("configured") ? reason.message : "Password update could not be completed. Sign in again and retry.");
    }
  }

  if (loading) return <div className="account-settings-loading"><span className="studio-loader" /><p>Opening your settings</p></div>;

  return <div className="account-settings">
    <section className="settings-section" aria-labelledby="settings-profile-heading"><header><span><UserRound size={17} aria-hidden="true" /></span><div><p className="eyebrow">Account / Identity</p><h3 id="settings-profile-heading">Personal details.</h3></div></header>
      <form className="settings-form" noValidate onSubmit={profileForm.handleSubmit(saveProfile)}>
        <div className="settings-form__grid"><label>Full name<input autoComplete="name" {...profileForm.register("fullName")} aria-invalid={!!profileForm.formState.errors.fullName} />{profileForm.formState.errors.fullName && <small role="alert">{profileForm.formState.errors.fullName.message}</small>}</label><label>Email address<input type="email" autoComplete="email" {...profileForm.register("email")} aria-invalid={!!profileForm.formState.errors.email} />{profileForm.formState.errors.email && <small role="alert">{profileForm.formState.errors.email.message}</small>}</label><label>Phone <span>Optional</span><input type="tel" autoComplete="tel" {...profileForm.register("phone")} aria-invalid={!!profileForm.formState.errors.phone} />{profileForm.formState.errors.phone && <small role="alert">{profileForm.formState.errors.phone.message}</small>}</label></div>
        <div className="settings-toggle-list"><label><input type="checkbox" {...profileForm.register("orderUpdates")} /><span><strong>Order updates</strong><small>Account notices about payment and delivery activity.</small></span></label><label><input type="checkbox" {...profileForm.register("emailMarketing")} /><span><strong>VANTA notes</strong><small>Occasional editorial and collection email.</small></span></label></div>
        <Feedback error={profileError} message={profileMessage} /><button className="button button--primary" type="submit">Save personal details <ArrowRight size={14} aria-hidden="true" /></button>
      </form>
    </section>

    <section className="settings-section" aria-labelledby="settings-password-heading"><header><span><LockKeyhole size={17} aria-hidden="true" /></span><div><p className="eyebrow">Account / Access</p><h3 id="settings-password-heading">{passwordReset ? "Choose a new password." : "Password management."}</h3></div></header>
      <form className="settings-form settings-password-form" noValidate onSubmit={passwordForm.handleSubmit(changePassword)}><label>New password<input type="password" autoComplete="new-password" {...passwordForm.register("password")} aria-invalid={!!passwordForm.formState.errors.password} />{passwordForm.formState.errors.password && <small role="alert">{passwordForm.formState.errors.password.message}</small>}</label><label>Confirm password<input type="password" autoComplete="new-password" {...passwordForm.register("confirmPassword")} aria-invalid={!!passwordForm.formState.errors.confirmPassword} />{passwordForm.formState.errors.confirmPassword && <small role="alert">{passwordForm.formState.errors.confirmPassword.message}</small>}</label><Feedback error={passwordError} message={passwordMessage} /><button className="button button--outline" type="submit">Update password <ArrowRight size={14} aria-hidden="true" /></button></form>
    </section>

    <section className="settings-section" aria-labelledby="settings-address-heading"><header><span><MapPin size={17} aria-hidden="true" /></span><div><p className="eyebrow">Account / Delivery</p><h3 id="settings-address-heading">Address book.</h3></div></header>
      {addresses.length ? <div className="settings-address-list">{addresses.map((address) => <article key={address.id}><div><strong>{address.recipient}</strong>{address.isDefault ? <span>DEFAULT</span> : null}</div><p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.region} {address.postalCode}<br />{address.countryCode}</p><button type="button" aria-label={`Remove address for ${address.recipient}`} onClick={() => void removeAddress(address.id)}><Trash2 size={13} aria-hidden="true" /> Remove</button></article>)}</div> : <p className="settings-intro">No delivery addresses saved yet. Add one to make future checkouts quicker.</p>}
      <form className="settings-form settings-address-form" noValidate onSubmit={addressForm.handleSubmit(saveAddress)}><p className="eyebrow">Add a delivery address</p><div className="settings-form__grid"><label>Recipient<input autoComplete="name" {...addressForm.register("recipient")} />{addressForm.formState.errors.recipient && <small role="alert">{addressForm.formState.errors.recipient.message}</small>}</label><label>Street address<input autoComplete="address-line1" {...addressForm.register("line1")} />{addressForm.formState.errors.line1 && <small role="alert">{addressForm.formState.errors.line1.message}</small>}</label><label>Apartment, suite <span>Optional</span><input autoComplete="address-line2" {...addressForm.register("line2")} /></label><label>City<input autoComplete="address-level2" {...addressForm.register("city")} />{addressForm.formState.errors.city && <small role="alert">{addressForm.formState.errors.city.message}</small>}</label><label>State / region<input autoComplete="address-level1" {...addressForm.register("region")} />{addressForm.formState.errors.region && <small role="alert">{addressForm.formState.errors.region.message}</small>}</label><label>Postal code<input autoComplete="postal-code" {...addressForm.register("postalCode")} />{addressForm.formState.errors.postalCode && <small role="alert">{addressForm.formState.errors.postalCode.message}</small>}</label><label>Country<select autoComplete="country" {...addressForm.register("countryCode")}><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="IN">India</option><option value="AU">Australia</option></select></label></div><label className="settings-default-address"><input type="checkbox" {...addressForm.register("isDefault")} /><span>Set as default delivery address</span></label><Feedback error={addressError} message={addressMessage} /><button className="button button--outline" type="submit"><Plus size={14} aria-hidden="true" /> Save address</button></form>
    </section>
  </div>;
}

function Feedback({ error, message }: { error: string; message: string }) {
  if (error) return <p className="settings-feedback settings-feedback--error" role="alert">{error}</p>;
  if (message) return <p className="settings-feedback" role="status"><Check size={13} aria-hidden="true" />{message}</p>;
  return null;
}
