# Real SIM Identity (Phone OTP + SIM Read) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock eSIM verification with real Supabase phone-OTP verification (test-OTP mode, no SMS provider) plus on-device SIM/carrier read, keeping the eSIM branding and the offline mock mode intact.

**Architecture:** The existing email-authenticated Supabase user gets a phone attached via the native `phone_change` OTP flow (`updateUser({ phone })` → `verifyOtp(type: 'phone_change')`), so `phone_confirmed_at` is genuinely set by the auth system. `expo-cellular` supplies carrier/country as display data stored on `profiles`. Three UI touchpoints (onboarding step 4, pre-join modal, sim-identity screen) branch: Supabase mode → real flow; mock mode → existing `EsimChecklist` animation unchanged.

**Tech Stack:** Expo SDK 54 / React Native / expo-router, Supabase Auth (phone_change OTP), `expo-cellular`, Zustand, i18next (RU/KK/EN).

**Spec:** `docs/superpowers/specs/2026-06-12-sim-identity-design.md`

**Conventions for the worker:**
- All commands run from the repo root.
- No test framework exists by design (hackathon spec). The per-task gate is `npx tsc --noEmit` — run it once before Task 1 to record pre-existing errors (expected: none); after each task it must report no NEW errors.
- App texts are trilingual: every new i18n key gets RU + KK + EN values (Task 3 has all of them — do not skip languages).

---

### Task 1: Foundation — expo-cellular, migration, types, sim helpers

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Create: `supabase/migrations/0003_sim_identity.sql`
- Modify: `src/lib/types.ts` (Profile interface)
- Create: `src/lib/sim.ts`

- [ ] **Step 1: Record the typecheck baseline**

Run: `npx tsc --noEmit`
Expected: no output (clean). If there are pre-existing errors, note them — later tasks must not add new ones.

- [ ] **Step 2: Install expo-cellular**

Run: `npx expo install expo-cellular`
Expected: `expo-cellular` appears in `package.json` dependencies with an SDK-54-compatible version.

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/0003_sim_identity.sql`:

```sql
-- SIM identity support. Paste into Supabase Dashboard -> SQL Editor and run once
-- (after 0001_schema.sql). Display-only carrier data read on-device; the
-- verified phone number itself lives in auth.users (set by the OTP flow).

alter table public.profiles add column if not exists sim_carrier text;
alter table public.profiles add column if not exists sim_country text;
```

- [ ] **Step 4: Extend the Profile type**

In `src/lib/types.ts`, replace the `Profile` interface:

```ts
export interface Profile {
  id: string;
  display_name: string;
  city: string;
  budget_tier: BudgetTier | null;
  interests: Category[];
  language: Lang;
  esim_verified: boolean;
  onboarding_completed: boolean;
  sim_carrier?: string | null;
  sim_country?: string | null;
}
```

- [ ] **Step 5: Create the SIM helpers**

Create `src/lib/sim.ts`:

```ts
import * as Cellular from 'expo-cellular';
import { Platform } from 'react-native';

export interface SimInfo {
  carrier: string | null;
  country: string | null;
}

// Never throws. Android returns real carrier data; iOS 16+ hides carrier
// info and web has none — those resolve to nulls.
export async function getSimInfo(): Promise<SimInfo> {
  if (Platform.OS === 'web') return { carrier: null, country: null };
  try {
    const [carrier, country] = await Promise.all([
      Cellular.getCarrierNameAsync(),
      Cellular.getIsoCountryCodeAsync(),
    ]);
    return {
      carrier: carrier ?? null,
      country: country ? country.toUpperCase() : null,
    };
  } catch {
    return { carrier: null, country: null };
  }
}

// '77011234567' or '+77011234567' -> '+7 ••• ••• 45 67'
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return phone;
  const last4 = digits.slice(-4);
  return `+${digits[0]} ••• ••• ${last4.slice(0, 2)} ${last4.slice(2)}`;
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors versus the Step 1 baseline.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json supabase/migrations/0003_sim_identity.sql src/lib/types.ts src/lib/sim.ts
git commit -m "feat: add sim helpers, profile columns, expo-cellular for SIM identity"
```

---

### Task 2: Auth store — verifiedPhone state + OTP actions

**Files:**
- Modify: `src/store/useAuthStore.ts`

- [ ] **Step 1: Extend the AuthState interface**

In `src/store/useAuthStore.ts`, add to imports:

```ts
import { getSimInfo } from '@/lib/sim';
```

Replace the `AuthState` interface:

```ts
interface AuthState {
  status: AuthStatus;
  userId: string | null;
  profile: Profile | null;
  /** E.164-ish verified phone (+7701...) when auth.users has a confirmed phone. */
  verifiedPhone: string | null;
  init: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  requestPhoneOtp: (phone: string) => Promise<{ error?: string }>;
  confirmPhoneOtp: (phone: string, code: string) => Promise<{ error?: string }>;
}
```

- [ ] **Step 2: Add the initial state and hydrate verifiedPhone in init**

In the `create<AuthState>((set, get) => ({ ... }))` object, add after `profile: null,`:

```ts
  verifiedPhone: null,
```

In `init`, replace the signed-in branch:

```ts
    if (session) {
      const profile = await loadSupabaseProfile(session.user.id);
      const u = session.user;
      set({
        status: 'signedIn',
        userId: u.id,
        profile,
        verifiedPhone:
          u.phone && u.phone_confirmed_at ? `+${u.phone.replace(/^\+/, '')}` : null,
      });
    } else {
      set({ status: 'signedOut' });
    }
```

- [ ] **Step 3: Clear verifiedPhone on sign-out**

In `signOut`, replace the final `set` call:

```ts
    set({ status: 'signedOut', userId: null, profile: null, verifiedPhone: null });
```

Also in `init`'s `onAuthStateChange` callback, replace the sign-out reset:

```ts
      if (!newSession) {
        set({ status: 'signedOut', userId: null, profile: null, verifiedPhone: null });
      }
```

- [ ] **Step 4: Add the two OTP actions**

Add after `updateProfile` inside the store object:

```ts
  requestPhoneOtp: async (phone) => {
    if (!isSupabaseConfigured) return {}; // mock mode: UI never reaches here, accept silently
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) return { error: error.message };
    return {};
  },

  confirmPhoneOtp: async (phone, code) => {
    if (!isSupabaseConfigured) {
      set({ verifiedPhone: phone });
      await get().updateProfile({ esim_verified: true });
      return {};
    }
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'phone_change' });
    if (error) return { error: error.message };
    const sim = await getSimInfo();
    set({ verifiedPhone: phone });
    await get().updateProfile({
      esim_verified: true,
      sim_carrier: sim.carrier,
      sim_country: sim.country,
    });
    return {};
  },
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/useAuthStore.ts
git commit -m "feat: add phone OTP actions and verifiedPhone to auth store"
```

---

### Task 3: Locales — RU / KK / EN strings

**Files:**
- Modify: `src/locales/ru.json`
- Modify: `src/locales/kk.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: Extend the `esim` and `sim` sections in ru.json**

In `src/locales/ru.json`, inside the existing `"esim": { ... }` object, add after `"concept": ...` (add a comma to the previous line):

```json
    "phoneLabel": "Номер телефона",
    "phoneHint": "Для демо используйте тестовый номер из белого списка — код фиксированный, SMS не отправляется",
    "sendCode": "Получить код",
    "codeLabel": "Код подтверждения для {{phone}}",
    "confirmCode": "Подтвердить",
    "changeNumber": "Изменить номер",
    "skip": "Пропустить пока",
    "confirmedTitle": "Личность подтверждена",
    "confirmedSubtitle": "Номер привязан к вашему аккаунту"
```

Inside `"sim": { ... }`, add after `"roadmap": ...` (comma on the previous line):

```json
    "statusTitle": "Статус идентификации",
    "statusNumber": "Номер",
    "statusCarrier": "Оператор SIM",
    "statusCountry": "Страна SIM",
    "statusNotVerified": "Номер ещё не подтверждён — пройдите проверку в онбординге или при вступлении в группу."
```

- [ ] **Step 2: Same keys in kk.json**

In `src/locales/kk.json`, `"esim"` section additions:

```json
    "phoneLabel": "Телефон нөмірі",
    "phoneHint": "Демо үшін ақ тізімдегі тест нөмірін қолданыңыз — код тұрақты, SMS жіберілмейді",
    "sendCode": "Код алу",
    "codeLabel": "{{phone}} нөміріне арналған растау коды",
    "confirmCode": "Растау",
    "changeNumber": "Нөмірді өзгерту",
    "skip": "Әзірге өткізіп жіберу",
    "confirmedTitle": "Жеке тұлға расталды",
    "confirmedSubtitle": "Нөмір аккаунтыңызға байланды"
```

`"sim"` section additions:

```json
    "statusTitle": "Сәйкестендіру мәртебесі",
    "statusNumber": "Нөмір",
    "statusCarrier": "SIM операторы",
    "statusCountry": "SIM елі",
    "statusNotVerified": "Нөмір әлі расталмаған — онбордингте немесе топқа қосылу кезінде тексеруден өтіңіз."
```

- [ ] **Step 3: Same keys in en.json**

In `src/locales/en.json`, `"esim"` section additions:

```json
    "phoneLabel": "Phone number",
    "phoneHint": "For the demo use a whitelisted test number — the code is fixed, no SMS is sent",
    "sendCode": "Send code",
    "codeLabel": "Verification code for {{phone}}",
    "confirmCode": "Confirm",
    "changeNumber": "Change number",
    "skip": "Skip for now",
    "confirmedTitle": "Identity confirmed",
    "confirmedSubtitle": "The number is linked to your account"
```

`"sim"` section additions:

```json
    "statusTitle": "Identity status",
    "statusNumber": "Number",
    "statusCarrier": "SIM carrier",
    "statusCountry": "SIM country",
    "statusNotVerified": "Number not verified yet — complete the check in onboarding or when joining a group."
```

- [ ] **Step 4: Verify all three files are valid JSON**

Run: `npx tsx -e "for (const l of ['ru','kk','en']) { require('./src/locales/' + l + '.json'); console.log(l, 'ok'); }"`
Expected: `ru ok`, `kk ok`, `en ok`

- [ ] **Step 5: Commit**

```bash
git add src/locales/ru.json src/locales/kk.json src/locales/en.json
git commit -m "feat: add SIM identity strings (ru/kk/en)"
```

---

### Task 4: PhoneVerifyForm component

**Files:**
- Create: `src/components/PhoneVerifyForm.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/PhoneVerifyForm.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  /** Fired after the OTP is confirmed (store already set esim_verified). */
  onVerified: () => void;
}

/**
 * Two-step phone verification: enter number -> enter OTP code.
 * Pure form — no navigation knowledge; parent decides what happens next.
 */
export function PhoneVerifyForm({ onVerified }: Props) {
  const { t } = useTranslation();
  const requestPhoneOtp = useAuthStore((s) => s.requestPhoneOtp);
  const confirmPhoneOtp = useAuthStore((s) => s.confirmPhoneOtp);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await requestPhoneOtp(phone.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setStep('code');
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await confirmPhoneOtp(phone.trim(), code.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onVerified();
  };

  return (
    <View style={styles.wrap}>
      {step === 'phone' ? (
        <>
          <Text style={styles.label}>{t('esim.phoneLabel')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
            placeholder="+7 701 123 45 67"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>{t('esim.phoneHint')}</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton
            title={t('esim.sendCode')}
            loading={busy}
            disabled={phone.replace(/\D/g, '').length < 11}
            onPress={sendCode}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>{t('esim.codeLabel', { phone: phone.trim() })}</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton
            title={t('esim.confirmCode')}
            loading={busy}
            disabled={code.trim().length < 6}
            onPress={confirm}
          />
          <Text
            style={styles.link}
            onPress={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}>
            {t('esim.changeNumber')}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: spacing.md },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  input: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.text,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontWeight: '800' },
  hint: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  error: { fontSize: 13, color: colors.danger },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (If `colors.danger` does not exist in `src/lib/theme.ts`, check the theme file and use the closest existing token — e.g. an existing error/red color — instead of adding a new one.)

- [ ] **Step 3: Commit**

```bash
git add src/components/PhoneVerifyForm.tsx
git commit -m "feat: add PhoneVerifyForm two-step OTP component"
```

---

### Task 5: Onboarding step 4 rework (skippable real verification)

**Files:**
- Modify: `src/app/(onboarding)/esim-verify.tsx`

- [ ] **Step 1: Replace the screen**

Replace the full contents of `src/app/(onboarding)/esim-verify.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EsimChecklist } from '@/components/EsimChecklist';
import { PhoneVerifyForm } from '@/components/PhoneVerifyForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { currentLang } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, spacing, typography } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function EsimVerify() {
  const router = useRouter();
  const { t } = useTranslation();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [done, setDone] = useState(false);

  // Writes onboarding data. esim_verified is NOT set here in Supabase mode:
  // confirmPhoneOtp already set it true; skipping leaves it untouched (false
  // for new users, true if verified in an earlier session).
  const completeOnboarding = useCallback(
    async (extra: { esim_verified?: boolean } = {}) => {
      const { interests, budget, city } = useOnboardingStore.getState();
      await updateProfile({
        interests,
        budget_tier: budget,
        city,
        language: currentLang(),
        onboarding_completed: true,
        ...extra,
      });
    },
    [updateProfile]
  );

  // Mock mode: the staged animation marks verified, as before.
  const finishMockVerification = useCallback(async () => {
    await completeOnboarding({ esim_verified: true });
    setDone(true);
  }, [completeOnboarding]);

  const handleVerified = useCallback(async () => {
    await completeOnboarding();
    setDone(true);
  }, [completeOnboarding]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  }, [completeOnboarding, router]);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.step}>{t('onboarding.step', { current: 4, total: 4 })}</Text>
        <Text style={typography.title}>{t('esim.title')}</Text>
        <Text style={typography.subtitle}>{t('esim.subtitle')}</Text>

        {!isSupabaseConfigured ? (
          <View style={styles.checklist}>
            <EsimChecklist onDone={finishMockVerification} />
          </View>
        ) : done ? null : (
          <View style={styles.form}>
            <PhoneVerifyForm onVerified={handleVerified} />
            <Text style={styles.skip} onPress={handleSkip}>
              {t('esim.skip')}
            </Text>
          </View>
        )}

        {done && (
          <View style={styles.doneBlock}>
            <Text style={styles.doneTitle}>{t('esim.verifiedTitle')}</Text>
            <Text style={styles.doneText}>{t('esim.verifiedSubtitle')}</Text>
          </View>
        )}
        <Text style={styles.concept}>{t('esim.concept')}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={t('common.continue')}
          disabled={!done}
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xxl, gap: spacing.md },
  step: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  checklist: { paddingTop: spacing.xl },
  form: { paddingTop: spacing.lg, gap: spacing.md },
  skip: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  doneBlock: { gap: spacing.xs, paddingTop: spacing.md },
  doneTitle: { fontSize: 16, fontWeight: '800', color: colors.success },
  doneText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  concept: { fontSize: 11, color: colors.textMuted, paddingTop: spacing.sm },
  footer: { paddingBottom: spacing.xl },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(onboarding)/esim-verify.tsx"
git commit -m "feat: real skippable phone verification in onboarding step 4"
```

---

### Task 6: EsimVerifyModal rework (status check or inline verification)

**Files:**
- Modify: `src/components/EsimVerifyModal.tsx`

- [ ] **Step 1: Replace the component**

Replace the full contents of `src/components/EsimVerifyModal.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { maskPhone } from '@/lib/sim';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { EsimChecklist } from './EsimChecklist';
import { PhoneVerifyForm } from './PhoneVerifyForm';

interface Props {
  visible: boolean;
  onVerified: () => void;
}

const CONFIRMED_AUTOCLOSE_MS = 1400;

/**
 * Pre-join identity check. Mock mode: staged animation (unchanged).
 * Supabase mode: already verified -> brief confirmed card, then proceeds;
 * not verified -> inline phone OTP form.
 */
export function EsimVerifyModal({ visible, onVerified }: Props) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const verifiedPhone = useAuthStore((s) => s.verifiedPhone);
  const alreadyVerified = isSupabaseConfigured && !!profile?.esim_verified;

  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  useEffect(() => {
    if (!visible || !alreadyVerified) return;
    const tm = setTimeout(() => onVerifiedRef.current(), CONFIRMED_AUTOCLOSE_MS);
    return () => clearTimeout(tm);
  }, [visible, alreadyVerified]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('esim.modalTitle')}</Text>
          <Text style={styles.subtitle}>{t('esim.modalSubtitle')}</Text>

          {!isSupabaseConfigured ? (
            visible && <EsimChecklist onDone={onVerified} />
          ) : alreadyVerified ? (
            <View style={styles.confirmed}>
              <View style={styles.confirmedIcon}>
                <Ionicons name="shield-checkmark" size={36} color={colors.success} />
              </View>
              <Text style={styles.confirmedTitle}>{t('esim.confirmedTitle')}</Text>
              {verifiedPhone && <Text style={styles.confirmedPhone}>{maskPhone(verifiedPhone)}</Text>}
              {profile?.sim_carrier && <Text style={styles.confirmedMeta}>{profile.sim_carrier}</Text>}
            </View>
          ) : (
            <PhoneVerifyForm onVerified={onVerified} />
          )}

          <Text style={styles.concept}>{t('esim.concept')}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { ...typography.h2, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center' },
  confirmed: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  confirmedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedTitle: { fontSize: 16, fontWeight: '800', color: colors.success },
  confirmedPhone: { fontSize: 15, fontWeight: '700', color: colors.text },
  confirmedMeta: { fontSize: 13, color: colors.textSecondary },
  concept: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (If `colors.successSoft` is missing from the theme, use the existing soft/success token from `EsimChecklist.tsx` — it already uses `colors.successSoft`, so it should exist.)

- [ ] **Step 3: Commit**

```bash
git add src/components/EsimVerifyModal.tsx
git commit -m "feat: pre-join modal checks real identity or verifies inline"
```

---

### Task 7: sim-identity screen — real status card

**Files:**
- Modify: `src/app/profile/sim-identity.tsx`

- [ ] **Step 1: Add imports and store reads**

In `src/app/profile/sim-identity.tsx`, extend the imports:

```tsx
import { maskPhone } from '@/lib/sim';
import { useAuthStore } from '@/store/useAuthStore';
```

Inside the `SimIdentity` component, after `const { t } = useTranslation();`:

```tsx
  const profile = useAuthStore((s) => s.profile);
  const verifiedPhone = useAuthStore((s) => s.verifiedPhone);
  const verified = !!profile?.esim_verified;
```

- [ ] **Step 2: Insert the status card**

In the JSX, right after `<Text style={styles.intro}>{t('sim.intro')}</Text>`, insert:

```tsx
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={verified ? 'shield-checkmark' : 'shield-outline'}
              size={20}
              color={verified ? colors.success : colors.textMuted}
            />
            <Text style={styles.statusTitle}>{t('sim.statusTitle')}</Text>
          </View>
          {verified ? (
            <>
              {verifiedPhone && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>{t('sim.statusNumber')}</Text>
                  <Text style={styles.statusValue}>{maskPhone(verifiedPhone)}</Text>
                </View>
              )}
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('sim.statusCarrier')}</Text>
                <Text style={styles.statusValue}>{profile?.sim_carrier ?? '—'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('sim.statusCountry')}</Text>
                <Text style={styles.statusValue}>{profile?.sim_country ?? '—'}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.statusEmpty}>{t('sim.statusNotVerified')}</Text>
          )}
        </View>
```

- [ ] **Step 3: Add the styles**

Add to the `StyleSheet.create({ ... })` object:

```tsx
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { fontSize: 13.5, color: colors.textSecondary },
  statusValue: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  statusEmpty: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/sim-identity.tsx
git commit -m "feat: show real SIM identity status in profile"
```

---

### Task 8: Supabase setup + smoke matrix

This task needs the user for dashboard configuration and physical devices.

- [ ] **Step 1 (user): Run the migration**

Supabase SQL Editor → run `supabase/migrations/0003_sim_identity.sql`.

- [ ] **Step 2 (user): Enable phone provider with test OTPs**

Supabase Dashboard → Authentication → Sign In / Providers → Phone:
- Enable the Phone provider (no SMS provider needed).
- In "Test phone numbers" (Test OTPs), add 2–3 numbers with fixed codes, e.g.
  `+77011234567` → `123456` and `+77017654321` → `123456`.

- [ ] **Step 3: Smoke matrix**

Run `npx expo start -c` and verify:

1. **Mock mode** (temporarily blank `EXPO_PUBLIC_SUPABASE_URL` or test on a build without env): onboarding step 4, pre-join modal, and profile all behave exactly as before (animation, badge).
2. **Supabase mode, verify path:** onboarding step 4 shows phone form → enter `+77011234567` → code `123456` → success state → Continue → profile shows Verified badge. Dashboard → Authentication → Users → the user's record shows the phone with confirmed status.
3. **Supabase mode, skip path:** new account → "Skip for now" → onboarding completes, no badge → open a group → Join → modal shows the OTP form → verify there → join proceeds, counter bumps (Realtime intact).
4. **Re-join when verified:** Join another group → modal shows "Identity confirmed" card with masked number → auto-proceeds in ~1.4 s.
5. **SIM read:** on an Android device, profile → SIM identity shows carrier name (e.g. Beeline KZ); on iOS/web shows "—".
6. **Unwhitelisted number:** entering a random number shows an inline Supabase error; skip/other paths remain usable.

- [ ] **Step 4: Final typecheck + commit any fixes**

Run: `npx tsc --noEmit` → clean.

```bash
git add -A
git commit -m "fix: smoke pass adjustments for SIM identity" # only if fixes were needed
```
