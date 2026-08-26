const LIMITA_ORIGIN = 'https://limita.org';

const UTM_SOURCE = 'activity-timer';
const UTM_MEDIUM = 'powerup';
const UTM_CAMPAIGN = 'maintenance-mode';

/**
 * Builds a limita.org URL tagged with UTM parameters so traffic originating
 * from the Activity Timer power-up can be measured.
 *
 * @param path Path on limita.org, e.g. '/' or '/pricing/'.
 * @param content Identifies which placement the click came from, e.g.
 *                'announcement-visit-site'. Maps to utm_content.
 */
export function getLimitaUrl(path: string, content: string) {
  const url = new URL(path, LIMITA_ORIGIN);

  url.searchParams.set('utm_source', UTM_SOURCE);
  url.searchParams.set('utm_medium', UTM_MEDIUM);
  url.searchParams.set('utm_campaign', UTM_CAMPAIGN);
  url.searchParams.set('utm_content', content);

  return url.toString();
}
