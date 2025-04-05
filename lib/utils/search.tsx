import React from 'react';

export const highlightMatch = (text: string, match: string): React.ReactNode => {
  if (!match) return text;
  
  try {
    const regex = new RegExp(`(${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === match.toLowerCase() ? (
            <span key={i} className="text-primary font-semibold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  } catch (error) {
    // If regex fails, return the original text
    console.error('Error in highlightMatch:', error);
    return text;
  }
};
