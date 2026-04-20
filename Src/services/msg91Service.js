const formatIndianMobile = (phone) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  return digitsOnly;
};

export const sendOtpViaMsg91 = async ({ phone, otp }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const mobile = formatIndianMobile(phone);
  const otpExpiryMinutes = 5;

  if (!authKey || !templateId) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MSG91 is not configured");
    }

    console.warn(
      `[MSG91:SKIPPED] Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID. OTP for ${phone} is ${otp}`,
    );
    return { skipped: true };
  }

  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("authkey", authKey);
  url.searchParams.set("otp", otp);
  url.searchParams.set("otp_expiry", String(otpExpiryMinutes));

  const response = await fetch(url.toString(), { method: "GET" });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `MSG91 request failed (${response.status}): ${responseText}`,
    );
  }

  return { skipped: false, response: responseText };
};
