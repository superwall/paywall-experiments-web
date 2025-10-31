import { usePostHog } from 'posthog-js/react';

// Event names - consistent naming convention
export const POSTHOG_EVENTS = {
  GENERATION_BEGIN: 'generation_begin',
  GENERATION_COMPLETE: 'generation_complete',
  EMAIL_PROMPT_SHOWN: 'email_prompt_shown',
  EMAIL_ENTERED: 'email_entered',
  VISIT_SUPERWALL_CLICKED: 'visit_superwall_clicked',
  SHARE_LINK_CLICKED: 'share_link_clicked',
  TRY_ANOTHER_CLICKED: 'try_another_clicked',
  EXAMPLE_CLICKED: 'example_clicked',
} as const;

// Hook to use PostHog
export function usePostHogTracking() {
  const posthog = usePostHog();
  return posthog;
}

// Helper function to identify user with email
export function identifyUserWithEmail(posthog: ReturnType<typeof usePostHogTracking> | null, email: string) {
  if (!posthog || !email) return;
  
  posthog.identify(email, {
    email: email,
  });
}

