import { Card } from '@/components/ui/card';
import RatingLadder from '@/components/rating/RatingLadder';
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardTitle,
} from '@/components/home/FeatureCard';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Ruleset } from '@otr/core/osu';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import HomeActionCards from '@/components/home/HomeActionCards';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const isLoggedIn = !!session;
  const playerId = session?.dbPlayer?.id ?? null;

  return (
    <div className="bg-background text-foreground container m-4 mx-auto flex min-h-screen flex-col gap-2 py-4">
      {/* Hero section */}
      <FeatureCard
        decoration={2}
        imagePosition="right"
        imageSize="h-[240px] w-[475px]"
        imageClassName="sm:-top-16"
        className="mb-4 items-center lg:py-10"
        contentClassName="px-2 max-w-md"
      >
        <FeatureCardTitle>osu! Tournament Rating</FeatureCardTitle>
        <FeatureCardDescription>
          A community-driven platform that ranks and predicts the performance of
          all osu! tournament players
        </FeatureCardDescription>
      </FeatureCard>

      {/* Link cards */}
      <HomeActionCards isLoggedIn={isLoggedIn} playerId={playerId} />

      {/* Feature sections */}
      <div className="space-y-6">
        {/* Verified tournaments */}
        <FeatureCard
          decoration={3}
          imagePosition="right"
          imageSize="h-[260px] w-[380px]"
          imageClassName="rotate-180"
          contentClassName="md:w-1/2"
        >
          <FeatureCardTitle>Verified tournaments</FeatureCardTitle>
          <FeatureCardDescription>
            Only human-verified tournament matches are included in our rating
            algorithm
          </FeatureCardDescription>
        </FeatureCard>

        {/* Use ratings to filter registrants */}
        <Card className="bg-card border-none p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold">
              Use ratings to filter registrants
            </h2>
            <p className="text-muted-foreground">
              High ratings indicate consistently strong performance in matches,
              possibly due to playing in tournaments below one&apos;s skill
              level.
            </p>
          </div>
          <RatingLadder />
        </Card>

        {/* Detailed beatmap histories */}
        <FeatureCard decoration={1} contentClassName="md:w-5/9 xl:w-1/2">
          <FeatureCardTitle>Detailed beatmap histories</FeatureCardTitle>
          <FeatureCardDescription>
            Learn where beatmaps have been pooled and how well players perform
            on them.
          </FeatureCardDescription>
        </FeatureCard>

        {/* New updates every Tuesday */}
        <FeatureCard
          decoration={1}
          imagePosition="right"
          imageClassName="rotate-180"
        >
          <FeatureCardTitle>New updates every Tuesday</FeatureCardTitle>
          <FeatureCardDescription>
            Ratings are recalculated every Tuesday at 12:00 UTC
          </FeatureCardDescription>
        </FeatureCard>

        {/* All modes supported */}
        <FeatureCard
          decoration={4}
          imageSize="h-[300px] w-[618px]"
          contentClassName="sm:max-md:flex-row items-center sm:items-center gap-4"
        >
          <div className="flex flex-col gap-2">
            <FeatureCardTitle>All modes supported</FeatureCardTitle>
            <FeatureCardDescription>
              Yes, mania 4K and 7K are entirely separate rulesets
            </FeatureCardDescription>
          </div>
          <div className="bg-popover flex justify-center gap-4 rounded-2xl border p-4 md:gap-6 md:p-6">
            {Object.keys(RulesetEnumHelper.metadata)
              .filter((r) => Number(r) !== Ruleset.ManiaOther)
              .map((r) => (
                <RulesetIcon
                  key={r}
                  ruleset={Number(r)}
                  className="fill-primary size-8 md:size-10 lg:size-12"
                />
              ))}
          </div>
        </FeatureCard>

        {/* Open source, open data */}
        <FeatureCard
          decoration={2}
          imagePosition="right"
          imageClassName="-top-25 -right-15"
          imageFit="cover"
          imageSize="h-[300px] w-[600px]"
          contentClassName="md:w-2/3"
        >
          <FeatureCardTitle>Open source, open data</FeatureCardTitle>
          <FeatureCardDescription>
            Built from the ground up with transparency in mind
          </FeatureCardDescription>
        </FeatureCard>
      </div>
    </div>
  );
}
