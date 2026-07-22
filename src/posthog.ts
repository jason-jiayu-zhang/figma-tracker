import posthog from 'posthog-js';

// Get keys from Vite environment variables or use fallback defaults
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || 'phc_rEc8CArya56G5Ypb5bkHRfd5ckigmbn9tx6JLnSRYuFB';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  person_profiles: 'identified_only',
});

export default posthog;
