const formatIndianMobile = (phone) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  return digitsOnly;
};

const isPlaceholderConfig = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    normalized.includes("your_") ||
    normalized.includes("template_id") ||
    normalized.includes("auth_key") ||
    normalized.includes("changeme")
  );
};

const STATUS_LABELS = {
  new:          "New / Pending",
  assigned:     "Confirmed",
  "in-progress":"Ongoing",
  completed:    "Completed",
  cancelled:    "Cancelled",
};

const sendFlowSms = async ({ templateId, mobile, variables }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || "AQFLOW";

  if (isPlaceholderConfig(authKey) || isPlaceholderConfig(templateId)) {
    return { skipped: true };
  }

  const body = {
    template_id: templateId,
    sender: senderId,
    recipients: [{ mobiles: formatIndianMobile(mobile), ...variables }],
  };

  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: authKey,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MSG91 flow failed (${response.status}): ${text}`);
  }
  return { skipped: false, response: text };
};

export const sendBookingStatusSms = async ({ phone, name, bookingId, status }) => {
  const templateId = process.env.MSG91_STATUS_TEMPLATE_ID;
  const label = STATUS_LABELS[status] || status;

  if (isPlaceholderConfig(process.env.MSG91_AUTH_KEY) || isPlaceholderConfig(templateId)) {
    console.warn(`[MSG91:SKIPPED] Status SMS → ${phone} | ${bookingId} → ${label}`);
    return { skipped: true };
  }

  try {
    return await sendFlowSms({
      templateId,
      mobile: phone,
      variables: { name: name || "Customer", booking_id: bookingId, status: label },
    });
  } catch (err) {
    console.error("[MSG91] sendBookingStatusSms error:", err.message);
    return { skipped: false, error: err.message };
  }
};

export const sendTimeSlotSms = async ({ phone, name, bookingId, timeSlot, date }) => {
  const templateId = process.env.MSG91_TIMESLOT_TEMPLATE_ID;

  if (isPlaceholderConfig(process.env.MSG91_AUTH_KEY) || isPlaceholderConfig(templateId)) {
    console.warn(`[MSG91:SKIPPED] TimeSlot SMS → ${phone} | ${bookingId} @ ${timeSlot}`);
    return { skipped: true };
  }

  try {
    return await sendFlowSms({
      templateId,
      mobile: phone,
      variables: { name: name || "Customer", booking_id: bookingId, time_slot: timeSlot, date: date || "" },
    });
  } catch (err) {
    console.error("[MSG91] sendTimeSlotSms error:", err.message);
    return { skipped: false, error: err.message };
  }
};

export const sendOtpViaMsg91 = async ({ phone, otp }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const mobile = formatIndianMobile(phone);
  const otpExpiryMinutes = 5;

  if (isPlaceholderConfig(authKey) || isPlaceholderConfig(templateId)) {
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
