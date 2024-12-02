import { HttpValidationProblemDetails, ProblemDetails } from "@osu-tournament-rating/otr-api-client";

export function isProblemDetails(obj: any): obj is ProblemDetails {
  return (
    obj !== null
    && obj !== undefined
    && typeof obj === 'object'
    && 'title' in obj
    && 'status' in obj
  );
}

export function isHttpValidationProblemDetails(obj: any): obj is HttpValidationProblemDetails {
  return (
    isProblemDetails(obj) 
    && 'errors' in obj
    && typeof obj.errors === 'object'
    && Object.values(obj.errors).every(
      (value) => Array.isArray(value) && value.every((v) => typeof v === "string")
    )
  );
}