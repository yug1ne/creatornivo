import { createHmac, timingSafeEqual } from "crypto";

export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key.trim(), value?.trim() ?? ""];
    }),
  );

  const timestamp = parts.ts;
  const receivedSignature = parts.h1;

  if (!timestamp || !receivedSignature) return false;

  const signedPayload = `${timestamp}:${rawBody}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}