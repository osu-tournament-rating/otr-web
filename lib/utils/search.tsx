export const highlightMatch = (text: string, match: string) => {
  if (!match) return text;
  const parts = text.split(new RegExp(`(${match})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === match.toLowerCase() ? (
          <span key={i} className="text-primary">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};
