import { HttpValidationProblemDetails, ProblemDetails, Roles } from "@osu-tournament-rating/otr-api-client";

/** Type guard for determining if an object is {@link ProblemDetails} */
export function isProblemDetails(obj: any): obj is ProblemDetails {
  return (
    obj !== null
    && obj !== undefined
    && typeof obj === 'object'
    && 'title' in obj
    && 'status' in obj
  );
}

/** Type guard for determining if an object is {@link HttpValidationProblemDetails} */
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

/** Denotes if a list of scopes containes the admin scope */
export function isAdmin(scopes: string[]) {
  return scopes.includes(Roles.Admin);
}