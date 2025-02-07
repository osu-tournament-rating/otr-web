'use server';

import { OAuthWrapper } from '@osu-tournament-rating/otr-api-client';
import { apiWrapperConfiguration } from '@/lib/api';
import { cache } from 'react';

export const refreshAccessToken = cache(async (refreshToken: string) => {
  const oauthWrapper = new OAuthWrapper(apiWrapperConfiguration);
  try {
    const { result } = await oauthWrapper.refresh({ refreshToken });
    return result.accessToken;
  } catch {
    return undefined;
  }
});
