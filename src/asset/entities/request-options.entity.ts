export interface RequestOptions {
  useSavedCookies?: boolean; // Default true (preserves Yahoo behavior)
  waitForSelector?: string; // Optional: Wait for a specific element (for Veracash)
  headless?: boolean; // Optional: override default
}
