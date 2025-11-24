export type CustomerIoEnv = {
  CUSTOMER_IO_SITE_ID?: string;
  CUSTOMER_IO_API_KEY?: string;
  CUSTOMER_IO_REGION?: string;
};

export type CustomerIoEventName =
  | "generation_complete"
  | "email_entered"
  | "visit_superwall_clicked";

const TRACK_ENDPOINT_US = "https://track.customer.io/api/v1";
const TRACK_ENDPOINT_EU = "https://track-eu.customer.io/api/v1";

function getTrackBaseUrl(env: CustomerIoEnv): string {
  const region = (env.CUSTOMER_IO_REGION || "us").toLowerCase();
  return region === "eu" ? TRACK_ENDPOINT_EU : TRACK_ENDPOINT_US;
}

export function isCustomerIoEnabled(env: CustomerIoEnv): boolean {
  return !!env.CUSTOMER_IO_SITE_ID && !!env.CUSTOMER_IO_API_KEY;
}

function getAuthHeader(env: CustomerIoEnv): string {
  const credentials = `${env.CUSTOMER_IO_SITE_ID}:${env.CUSTOMER_IO_API_KEY}`;
  // Cloudflare Workers expose btoa globally
  return `Basic ${btoa(credentials)}`;
}

async function sendCustomerIoRequest(
  env: CustomerIoEnv,
  path: string,
  options: RequestInit
): Promise<void> {
  if (!isCustomerIoEnabled(env)) return;

  const url = `${getTrackBaseUrl(env)}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", getAuthHeader(env));
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Customer.io] Request failed", {
      path,
      status: response.status,
      statusText: response.statusText,
      body: text,
    });
  }
}

export async function identifyCustomer(
  env: CustomerIoEnv,
  email: string,
  traits: Record<string, unknown>
): Promise<void> {
  if (!email || !isCustomerIoEnabled(env)) return;

  try {
    await sendCustomerIoRequest(env, `/customers/${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify(traits),
    });
  } catch (error) {
    console.error("[Customer.io] Identify failed", error);
  }
}

export async function trackCustomerIoEvent(
  env: CustomerIoEnv,
  email: string,
  event: CustomerIoEventName,
  data: Record<string, unknown>
): Promise<void> {
  if (!email || !isCustomerIoEnabled(env)) return;

  try {
    await sendCustomerIoRequest(env, "/events", {
      method: "POST",
      body: JSON.stringify({
        name: event,
        data,
        customer_id: email,
      }),
    });
  } catch (error) {
    console.error("[Customer.io] Event tracking failed", error);
  }
}

export function extractEmailFromCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/paywall_ai_email=([^;]+)/);
  if (!match || !match[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
