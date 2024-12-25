'use server';

import { isHttpValidationProblemDetails } from "@/lib/api";
import { apiWrapperConfiguration } from "@/lib/auth";
import { BeatmapLinkPattern, MatchLinkPattern } from "@/lib/regex";
import { TournamentSubmissionFormSchema } from "@/lib/schemas";
import { FormState } from "@/lib/types";
import { extractFormData } from "@/util/forms";
import { TournamentSubmissionDTO, TournamentsWrapper } from "@osu-tournament-rating/otr-api-client";
import { ZodError } from "zod";

/**
 * Handles parsing, submiting, and handling errors for tournament submission data
 * @param _previousState Previous form state
 * @param formData Form data
 * @returns The state of the form after performing the action
 */
export async function tournamentSubmissionFormAction(
  _previousState: FormState<TournamentSubmissionDTO>,
  formData: FormData
): Promise<FormState<TournamentSubmissionDTO>> {
  const result: FormState<TournamentSubmissionDTO> = {
    success: false,
    message: "",
    errors: {}
  };

  try {
    const parsedForm = TournamentSubmissionFormSchema.parse(extractFormData<TournamentSubmissionDTO>(formData, {
      ruleset: value => parseInt(value),
      ids: value => value
        // Split at new lines
        .split(/\r?\n/g)
        // Filter out empty strings
        .filter(s => s.trim() !== '')
        .map(s => {
          // Trim whitespace
          s = s.trim();

          // If the string is parseable to an int as is, do so
          if (/^\d+$/.test(s)) {
            return parseFloat(s);
          }
          
          // Try to extract the id using regex
          const match = MatchLinkPattern.exec(s);

          if (match == null) {
            return "<Invalid match link>";
          }

          const url = match[0];
          return match ? parseFloat(url.substring(url.lastIndexOf('/') + 1)) : s;
        }),
      beatmapIds: value => value
        .split(/\r?\n/g)
        .filter(s => s.trim() !== '')
        .map(s => {
          s = s.trim();

          if (/^\d+$/.test(s)) {
            return parseFloat(s);
          }

          const match = BeatmapLinkPattern.exec(s);
          return match ? parseFloat(match[1]) : s;
        })
    }));

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