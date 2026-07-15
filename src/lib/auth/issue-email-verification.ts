import {
  issueEmailVerificationToken,
  type EmailVerificationStore,
} from "@/lib/auth/email-verification";
import { prismaEmailVerificationStore } from "@/lib/auth/email-verification-store";
import { sendEmailVerificationEmail } from "@/lib/email/send-email-verification";

/**
 * Create a verification token and send the confirmation email.
 * Fire-and-forget friendly: logs failures; does not throw for send failures.
 */
export async function issueAndSendEmailVerification(input: {
  email: string;
  name: string | null;
  store?: EmailVerificationStore;
  sendEmail?: typeof sendEmailVerificationEmail;
  now?: () => Date;
}): Promise<{ delivered: boolean }> {
  const store = input.store ?? prismaEmailVerificationStore;
  const sendEmail = input.sendEmail ?? sendEmailVerificationEmail;

  const issued = await issueEmailVerificationToken(
    input.email,
    store,
    input.now,
  );

  try {
    const { delivered } = await sendEmail({
      email: issued.email,
      name: input.name,
      plainToken: issued.plainToken,
    });
    return { delivered };
  } catch (error) {
    console.error("[email] Email verification send failed:", error);
    return { delivered: false };
  }
}
