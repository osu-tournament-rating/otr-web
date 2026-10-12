// The osu! OAuth application has this callback URL registered. better-auth 1.7
// serves the callback at /api/auth/callback/:providerId instead, so the osu!
// provider keeps sending this URL and next.config redirects it to the new
// route. Changing it means updating the osu! OAuth application first.
export const LEGACY_OAUTH_CALLBACK_PATH = '/api/auth/oauth2/callback';

/** Absolute legacy callback URL for a provider, or undefined without a base URL. */
export const legacyOAuthCallbackURL = (
  providerId: string,
  baseURL: string | undefined
) =>
  baseURL
    ? new URL(`${LEGACY_OAUTH_CALLBACK_PATH}/${providerId}`, baseURL).toString()
    : undefined;
