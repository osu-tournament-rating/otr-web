import Link from 'next/link';
import Image from 'next/image';
import { PlayerSearchResultDTO } from '@osu-tournament-rating/otr-api-client';

export default function PlayerSearchResult({
  input,
  data,
}: {
  input: string;
  data: PlayerSearchResultDTO;
}) {
  console.log(data);
  const highlightMatch = (text: string, match: string) => {
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

  return (
    <div className="flex flex-row gap-5 rounded-xl bg-accent p-2">
      <Image
        className="rounded-full"
        width={32}
        height={32}
        src={`https://s.ppy.sh/a/${data.osuId}`}
        alt={`${data.osuId} profile picture`}
      />
      <Link href={`/players/${data.id}`}>
        <p className="text-lg">
          {highlightMatch(data.username ?? 'Unknown user', input)}
        </p>
      </Link>
      <div className="flex-row gap-2 text-accent-foreground"></div>
    </div>
  );
}
