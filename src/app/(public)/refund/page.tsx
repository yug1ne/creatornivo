import { permanentRedirect } from "next/navigation";

/** Short path for Paddle / external links → canonical Refund Policy. */
export default function RefundRedirectPage() {
  permanentRedirect("/refund-policy");
}
