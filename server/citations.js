/**
 * Citation classification.
 *
 * A yes/no mention is a vanity metric. What makes a result actionable is
 * *where* the model got its answer:
 *
 *   directory-only  -> the model knows the category but not the business.
 *                      Fix is first-party content and structured data.
 *   first-party     -> the site is being retrieved directly. Different fix.
 *   absent          -> a retrieval problem, not a ranking problem.
 */

const DIRECTORY_HOSTS = [
  'yelp.com', 'yellowpages.com', 'bbb.org', 'thumbtack.com', 'angi.com',
  'angieslist.com', 'homeadvisor.com', 'nextdoor.com', 'mapquest.com',
  'tripadvisor.com', 'houzz.com', 'porch.com', 'expertise.com', 'manta.com',
  'chamberofcommerce.com', 'superpages.com', 'citysearch.com', 'foursquare.com',
];

const SOCIAL_HOSTS = [
  'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'linkedin.com',
  'tiktok.com', 'youtube.com', 'pinterest.com',
];

const PLATFORM_HOSTS = [
  'google.com', 'bing.com', 'reddit.com', 'wikipedia.org',
  'openai.com', 'chatgpt.com', 'gemini.google.com', 'perplexity.ai',
];

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return null; }
}

function matches(host, list) {
  return list.some(d => host === d || host.endsWith(`.${d}`));
}

/**
 * @param {string} url
 * @param {string|null} businessDomain  e.g. "example.com" — when known, an exact
 *   match is classified first_party regardless of anything else.
 */
export function classify(url, businessDomain = null) {
  const host = hostOf(url);
  if (!host) return 'invalid';

  if (businessDomain) {
    const bd = businessDomain.replace(/^www\./, '').toLowerCase();
    if (host === bd || host.endsWith(`.${bd}`)) return 'first_party';
  }
  if (matches(host, DIRECTORY_HOSTS)) return 'directory';
  if (matches(host, SOCIAL_HOSTS))    return 'social';
  if (matches(host, PLATFORM_HOSTS))  return 'platform';
  return 'other';
}

/** Summarise a citation list into the shape the dashboard renders. */
export function summarise(urls, businessDomain = null) {
  const buckets = { first_party: [], directory: [], social: [], platform: [], other: [], invalid: [] };
  for (const u of urls) buckets[classify(u, businessDomain)].push(u);

  const counted = Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, v.length]),
  );

  // The diagnosis the whole tool exists to produce.
  let diagnosis;
  if (urls.length === 0)                    diagnosis = 'no_citations';
  else if (counted.first_party > 0)         diagnosis = 'retrieved_directly';
  else if (counted.directory > 0)           diagnosis = 'directory_only';
  else                                      diagnosis = 'indirect_only';

  return { total: urls.length, counts: counted, buckets, diagnosis };
}

export const DIAGNOSIS_TEXT = {
  no_citations:       'The model answered without citing sources. Nothing to act on from this run.',
  retrieved_directly: 'The business’s own pages were retrieved. The site is reachable to the model.',
  directory_only:     'Only third-party directories were cited. The model knows the category but is not finding the business itself — first-party content and structured data are the lever.',
  indirect_only:      'Cited sources are neither the business nor directories. Coverage is incidental.',
};
