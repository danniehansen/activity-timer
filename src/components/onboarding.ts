import { getTrelloInstance } from './trello';

/**
 * Onboarding state tracking
 * Stores which help sections users have interacted with to show subtle vs prominent help
 */

const ONBOARDING_KEY = 'act-timer-onboarding-state';

export interface OnboardingState {
  // Timestamps of when user first interacted with features
  cardBackSection?: number;
  settings?: number;
  estimates?: number;
  manualTime?: number;
  calendar?: number;
  exports?: number;
  notifications?: number;
  autoTimer?: number;
}

/**
 * Get the onboarding state for the current user
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  try {
    const state = await getTrelloInstance().get<OnboardingState>(
      'member',
      'private',
      ONBOARDING_KEY
    );
    return state || {};
  } catch (e) {
    console.debug('Error getting onboarding state', e);
    return {};
  }
}

/**
 * Mark a feature as seen/used by the user
 */
export async function markFeatureAsSeen(
  feature: keyof OnboardingState
): Promise<void> {
  try {
    const state = await getOnboardingState();

    // Only mark if not already marked
    if (!state[feature]) {
      state[feature] = Date.now();
      await getTrelloInstance().set('member', 'private', ONBOARDING_KEY, state);
    }
  } catch (e) {
    console.debug('Error marking feature as seen', e);
  }
}

/**
 * Check if user has seen a feature (returns true if seen more than 2 days ago)
 */
export async function isActiveUser(
  feature: keyof OnboardingState
): Promise<boolean> {
  const state = await getOnboardingState();
  const timestamp = state[feature];

  if (!timestamp) {
    return false;
  }

  // Consider "active" if they've seen it more than 2 days ago
  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
  return timestamp < twoDaysAgo;
}

/**
 * Check if user is generally familiar with the power-up
 */
export async function isGenerallyActiveUser(): Promise<boolean> {
  const state = await getOnboardingState();
  const features = Object.values(state).filter(Boolean);

  // If they've used 2+ features, consider them an active user
  return features.length >= 2;
}

/**
 * Reset onboarding state (for testing)
 */
export async function resetOnboardingState(): Promise<void> {
  try {
    await getTrelloInstance().remove('member', 'private', ONBOARDING_KEY);
  } catch (e) {
    console.debug('Error resetting onboarding state', e);
  }
}
