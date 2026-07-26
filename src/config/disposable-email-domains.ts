/**
 * Small static blocklist of well-known disposable / temporary email domains.
 * Intentionally narrow — major providers (Gmail, Outlook, Yahoo, iCloud, Proton)
 * are never listed here.
 */

import { getEmailDomain } from "@/lib/security/email-normalization";

export { getEmailDomain };

export const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tmpmail.org",
  "tmpmail.net",
  "10minutemail.com",
  "10minutemail.net",
  "10minemail.com",
  "minutemail.com",
  "throwaway.email",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "trash-mail.com",
  "getnada.com",
  "nada.email",
  "maildrop.cc",
  "dispostable.com",
  "mailnesia.com",
  "fakeinbox.com",
  "mailcatch.com",
  "tempail.com",
  "tempr.email",
  "discard.email",
  "discardmail.com",
  "mailnull.com",
  "spamgourmet.com",
  "mytemp.email",
  "emailondeck.com",
  "getairmail.com",
  "mohmal.com",
  "inboxkitten.com",
  "burnermail.io",
  "mailforspam.com",
  "tempinbox.com",
  "mailtemp.info",
] as const;

const disposableDomainSet = new Set<string>(
  DISPOSABLE_EMAIL_DOMAINS.map((domain) => domain.toLowerCase()),
);

/**
 * Returns true when the email uses a known disposable/temporary domain
 * (exact match or subdomain of a listed domain).
 */
export function isDisposableEmailDomain(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) {
    return false;
  }

  if (disposableDomainSet.has(domain)) {
    return true;
  }

  for (const blocked of disposableDomainSet) {
    if (domain.endsWith(`.${blocked}`)) {
      return true;
    }
  }

  return false;
}
