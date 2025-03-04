import { IOtrApiWrapperConfiguration, MeWrapper, OAuthWrapper, SearchWrapper, TournamentsWrapper } from "@osu-tournament-rating/otr-api-client";

const configuration: IOtrApiWrapperConfiguration = {
    baseUrl: process.env.OTR_API_ROOT as string
}

export const oAuth = new OAuthWrapper(configuration);
export const me = new MeWrapper(configuration);
export const tournaments = new TournamentsWrapper(configuration);
export const search = new SearchWrapper(configuration);