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
  const pattern = escapedTokens.join('|');

  try {
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    const lowerTokens = tokens.map((token) => token.toLowerCase());

    return (
      <>
        {parts.map((part, index) => {
          if (!part) {
            return <React.Fragment key={index} />;
          }

          const shouldHighlight = lowerTokens.includes(part.toLowerCase());

          return shouldHighlight ? (
            <span key={index} className="text-primary font-semibold">
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
