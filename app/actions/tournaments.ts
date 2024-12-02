'use server';

import { isHttpValidationProblemDetails } from "@/lib/api";
import { apiWrapperConfiguration } from "@/lib/auth";
import { BeatmapLinkPattern, MatchLinkPattern } from "@/lib/regex";
import { TournamentSubmissionFormSchema } from "@/lib/schemas";
import { FormState } from "@/lib/types";
import { TournamentSubmissionDTO, TournamentsWrapper } from "@osu-tournament-rating/otr-api-client";
import { ZodError } from "zod";

export async function tournamentSubmissionFormAction(
  previousState: FormState<TournamentSubmissionDTO>,
  formData: FormData
): Promise<FormState<TournamentSubmissionDTO>> {
  const result: FormState<TournamentSubmissionDTO> = {
    success: false,
    message: "",
    errors: {}
  };

  try {
    // Format mp and beatmap ids
    const ids = (formData.get('ids') as string)
      // Split at new lines
      .split(/\r?\n/g)
      // Filter out empty strings
      .filter(s => s.trim() !== '')
      .map(s => {
        // Trim whitespace
        s = s.trim();

        // If the string is parseable to an int as is, do so
        if (!isNaN(parseFloat(s))) {
          return parseFloat(s);
        }
        
        // Try to extract the id using regex
        const match = MatchLinkPattern.exec(s);
        return match ? parseFloat(match[1]) : s;
      });

    const beatmapIds = (formData.get('beatmapIds') as string)
      .split(/\r?\n/g)
      .filter(s => s.trim() !== '')
      .map(s => {
        s = s.trim();

        if (!isNaN(parseFloat(s))) {
          return parseFloat(s);
        }

        // Try to extract the beatmap id using regex
        const match = BeatmapLinkPattern.exec(s);
        return match ? parseFloat(match[1]) : s;
      });

    // Parse form data
    const parsedForm = TournamentSubmissionFormSchema.parse({
      name: formData.get('name'),
      abbreviation: formData.get('abbreviation'),
      forumUrl: formData.get('forumPostURL'),
      rankRangeLowerBound: parseInt(formData.get('rankRangeLowerBound') as string),
      lobbySize: parseInt(formData.get('lobbySize') as string),
      ruleset: parseInt(formData.get('ruleset') as string),
      ids,
      beatmapIds
    });

    const wrapper = new TournamentsWrapper(apiWrapperConfiguration);
    await wrapper.create({ body: parsedForm });

    result.message = "Successfully processed your submission. Thank you for contributing!";
    result.success = true;
  } catch (err) {
    result.message = "Submission was not successful.";
    result.success = false;

    // Handle parsing errors
    if (err instanceof ZodError) {
      Object.assign(result.errors, err.flatten().fieldErrors);
      result.message += " There was a problem processing your submission.";
    }

    // Handle API errors
    if (isHttpValidationProblemDetails(err)) {
      Object.assign(result.errors, err.errors);
      result.message += " The server rejected your submission.";
    }
  }

  return result;
}