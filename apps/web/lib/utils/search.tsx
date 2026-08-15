import React from 'react';

export const highlightMatch = (
  text: string,
  match: string
): React.ReactNode => {
  if (!match) return text;

  const normalizedQuery = match
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedQuery) {
    return text;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return text;
  }

  const escapedTokens = tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  // The query drops punctuation before it is tokenised, so `w/www` arrives as
  // `w` + `www`. Matching the tokens one at a time leaves the `/` between them
  // unhighlighted in `w/WWW`; runs of adjacent tokens are matched first, with
  // whatever separated them, and only then each token on its own.
  const alternatives: string[] = [];
  for (let length = escapedTokens.length; length > 1; length -= 1) {
    for (let start = 0; start + length <= escapedTokens.length; start += 1) {
      alternatives.push(
        escapedTokens.slice(start, start + length).join('[^\\p{L}\\p{N}]+')
      );
    }
  }
  // Longest first, so `www` wins over `w` where both could match.
  alternatives.push(
    ...[...escapedTokens].sort((left, right) => right.length - left.length)
  );
  const pattern = alternatives.map((entry) => `(?:${entry})`).join('|');

  try {
    const regex = new RegExp(`(${pattern})`, 'giu');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) => {
          if (!part) {
            return <React.Fragment key={index} />;
          }

          // `split` with a single capture group alternates unmatched text and
          // captures, so every odd index is a match.
          const shouldHighlight = index % 2 === 1;

          return shouldHighlight ? (
            <span key={index} className="font-semibold text-primary">
              {part}
            </span>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          );
        })}
      </>
    );
  } catch (error) {
    // If regex fails, return the original text
    console.error('Error in highlightMatch:', error);
    return text;
  }
};
