# OTP MSG91 Fallback Design

**Date:** 2026-05-25  
**Status:** Approved

## Problem

When MSG91 fails (bad credentials, network error) or is not configured, `sendAuthOtp` and `forgotPassword` return a 500 error to the client — even though the OTP was already saved to the database. The client cannot proceed even though the OTP exists and is valid.

## Goal

Always store the OTP in the database and always return success to the client. MSG91 delivery is a best-effort side effect. Failures are logged server-side but never surface to the client.

## Changes

### 1. `Src/services/msg91Service.js`

Remove the production-only throw when MSG91 config is missing. Both dev and production now log a warning and return `{ skipped: true }`.

**Before:**
```js
if (isPlaceholderConfig(authKey) || isPlaceholderConfig(templateId)) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("MSG91 is not configured");
  }
  console.warn(`[MSG91:SKIPPED] ...`);
  return { skipped: true };
}
```

**After:**
```js
if (isPlaceholderConfig(authKey) || isPlaceholderConfig(templateId)) {
  console.warn(`[MSG91:SKIPPED] Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID. OTP for ${phone} is ${otp}`);
  return { skipped: true };
}
```

### 2. `Src/controllers/otpController.js` — `sendAuthOtp`

Wrap the MSG91 call in an inner try-catch. DB save happens before this call and is unaffected.

```js
try {
  await sendOtpViaMsg91({ phone, otp });
} catch (smsError) {
  console.error(`[MSG91:FAILED] OTP for ${phone} is ${otp} — ${smsError.message}`);
}
```

### 3. `Src/controllers/otpController.js` — `forgotPassword`

Same inner try-catch wrapping as `sendAuthOtp`.

## Invariants

- OTP is always saved to DB before the MSG91 call — no change needed here.
- Client always receives `200 { success: true, message: "OTP sent" }`.
- MSG91 failures are logged with the OTP value so it can be recovered from server logs during development/debugging.
- Rate limiting and expiry logic are unchanged.

## Out of Scope

- Retry logic for MSG91 failures
- Alternative SMS providers
- Client-side indication of SMS delivery status
