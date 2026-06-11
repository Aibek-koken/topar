# Real SIM Identity (Phone OTP + SIM Read) — Design

**Date:** 2026-06-12
**Status:** Approved
**Project:** Topar (hackathon MVP — group buying app)

## Goal

Replace the mock eSIM verification animation with two real identity signals —
phone-number possession proven by a Supabase Auth OTP, and on-device SIM/carrier
data — while keeping the eSIM concept branding and the offline mock mode intact.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Scope of "real eSIM" | Not actual eSIM issuance (rejected: costs, partner-API approval). Combo of real phone OTP verification + device SIM read, with eSIM story as concept UI on top |
| OTP backend | Supabase Auth native `phone_change` flow on the existing email-authenticated user — no custom OTP code, `phone_confirmed_at` genuinely set by the auth system |
| SMS delivery | None. Supabase test phone numbers with fixed OTP codes (dashboard config). Upgrading to real SMS later = enabling Twilio in the dashboard, zero code changes |
| Mandatory? | Verifiable but skippable in onboarding. Skip ⇒ no Verified badge; the pre-join modal offers verification to skippers. Nobody is hard-blocked on an unwhitelisted number |
| SIM read | `expo-cellular` carrier name + ISO country. Android works; iOS 16+ and web hide carrier info and degrade to "—" |
| Mock mode | Untouched: without Supabase credentials all touchpoints keep the current `EsimChecklist` animation |

## Architecture

Two real signals behind the existing eSIM-branded UI:

1. **Phone possession.** App calls `supabase.auth.updateUser({ phone })` →
   Supabase generates an OTP (delivered nowhere; test numbers carry fixed codes) →
   user enters the code → `supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })`
   → Supabase stamps `phone_confirmed_at` on the auth user.
2. **SIM presence.** `expo-cellular` reads carrier name and ISO country on
   device, stored on the profile as flavor data.

`esim_verified` on `profiles` keeps its name and UI meaning, but now becomes
true only through a completed OTP confirmation (in Supabase mode).

## Components

| Unit | Kind | Responsibility |
|---|---|---|
| `src/lib/sim.ts` | new | `getSimInfo(): Promise<{ carrier: string \| null; country: string \| null }>` — expo-cellular with platform guards; never throws, nulls where the platform hides data |
| `src/components/PhoneVerifyForm.tsx` | new | Two-step form: phone input (+7 prefilled) → 6-digit code input, loading/error states. Calls `useAuthStore` actions; no navigation knowledge. Reused by onboarding and the pre-join modal |
| `useAuthStore` | extend | `requestPhoneOtp(phone)` → `updateUser({ phone })`; `confirmPhoneOtp(phone, code)` → `verifyOtp(type: 'phone_change')`, then updates `profiles` with `esim_verified: true` + `sim_carrier`/`sim_country` from `getSimInfo()` |
| `src/app/(onboarding)/esim-verify.tsx` | rework | Supabase mode: `PhoneVerifyForm` + "skip for now" link (skip completes onboarding with `esim_verified: false`). Mock mode: existing checklist animation |
| `src/components/EsimVerifyModal.tsx` | rework | Already verified: masked phone + carrier, brief "identity confirmed" state, proceed to join (no re-OTP). Not verified: embeds `PhoneVerifyForm`. Mock mode: existing checklist |
| `src/app/profile/sim-identity.tsx` | extend | Shows masked verified number, verification date, carrier, country alongside the existing architecture explainer |
| `supabase/migrations/0003_sim_identity.sql` | new | `alter table profiles add sim_carrier text, add sim_country text` |
| `src/locales/{ru,kk,en}.json` | extend | Strings for phone input, code input, errors, skip, verified states |

## Data flow

- The verified phone number lives in `auth.users` (Supabase-owned), not in `profiles`.
- `profiles` gains `sim_carrier` and `sim_country` (nullable text, display-only).
- The Verified badge keys off `profiles.esim_verified`, unchanged for consumers.

## Error handling

- Wrong code → inline error from Supabase; retry allowed; "resend" re-calls `updateUser`.
- Unwhitelisted number → Supabase returns a send error (no SMS provider configured)
  → inline message suggesting a demo test number; skip stays available.
- `getSimInfo()` failures never block verification — carrier fields stay null.

## Testing (manual smoke matrix)

1. Mock mode: all three touchpoints play the old animation, no regressions.
2. Supabase mode: verify with a whitelisted test number → badge appears,
   `phone_confirmed_at` visible in the dashboard's user record.
3. Skip path: onboarding completes without badge; pre-join modal offers
   verification and completes it.
4. Android: carrier name shows in sim-identity; iOS/web: "—".

## Setup (user-owned, Supabase dashboard)

Authentication → Sign In / Providers → Phone → enable; add 2–3 test phone
numbers with fixed OTP codes (e.g. `+77011234567` → `123456`).

## Out of scope

- Real SMS delivery (Twilio et al.) — config-only upgrade later.
- Actual eSIM issuance/provisioning.
- Phone-based sign-in (auth remains email+password; phone is a verified attribute).
- Anti-fraud (rate limiting beyond Supabase defaults, device attestation).
