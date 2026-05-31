export type OnboardingMilestone = "no_api_key" | "api_key_created_no_successful_request" | "first_request_complete";

export type OnboardingState = {
  milestone: OnboardingMilestone;
  hasApiKey: boolean;
  hasSuccessfulRequest: boolean;
  apiKeyCount: number;
  successfulRequestCount: number;
};
