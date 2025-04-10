import { Card } from '@/components/ui/card';
import RatingLadder from '@/components/rating/RatingLadder';
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardTitle,
} from '@/components/home/FeatureCard';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { RulesetEnumHelper } from '@/lib/enums';
import LinkCard from '@/components/home/LinkCard';

export default async function Page() {
  return (
    <div className="container m-4 mx-auto flex min-h-screen flex-col gap-2 bg-background py-4 font-sans text-foreground">
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

      {/* Rating Ladder */}
      <Card className="mb-4 border-none bg-card-alt p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Rise to the top</h2>
          <p className="text-muted-foreground">
            Join your friends on the ladder as soon as you play in a verified
            tournament
          </p>
        </div>
        <RatingLadder />
      </Card>

      {/* Link cards */}
      <div className="mb-4 grid grid-cols-1 gap-6 md:grid-cols-3">
        <LinkCard
          title="View Rankings"
          description="Find out where you stack up against your friends... and foes"
          icon="medal"
          href={'/leaderboard'}
        />

        <LinkCard
          title="Browse Tournaments"
          description="View the latest and greatest or go back in time"
          icon="trophy"
          href={'/tournaments'}
        />

        <LinkCard
          title="Read the docs"
          description="Learn the inner-workings of our rating algorithm"
          icon="book"
          href="https://docs.otr.stagec.xyz"
          target="_blank"
        />
      </div>

      {/* Feature sections */}
      <div className="space-y-6">
        {/* Rating restricted tournaments */}
        <FeatureCard
          decoration={1}
          contentClassName="md:w-5/9 xl:w-1/2"
        >
          <FeatureCardTitle>Rating restricted tournaments</FeatureCardTitle>
          <FeatureCardDescription>
            o!TR opens the door to an all-new level of fair competition in
            tournaments targeting specific skill brackets
          </FeatureCardDescription>
        </FeatureCard>

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

        {/* Stats on stats */}
        <FeatureCard
          decoration={2}
          imageClassName="-left-50 top-0 rotate-180"
          imageSize="h-[260px] w-[600px]"
          contentClassName="md:w-2/3 xl:w-1/2"
        >
          <FeatureCardTitle>Stats on stats</FeatureCardTitle>
          <FeatureCardDescription>
            Powerful tools for players and teams. Compare performance, track
            progress, and analyze your tournament history with ease
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
            Ratings are recalculated every Tuesday at 23:59 UTC
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
          <div className="flex justify-center gap-4 rounded-2xl bg-muted/90 p-4 backdrop-blur-md md:gap-6 md:p-6">
            {Object.keys(RulesetEnumHelper.metadata)
              .filter((r) => Number(r) !== Ruleset.ManiaOther)
              .map((r) => (
                <RulesetIcon
                  key={r}
                  ruleset={Number(r)}
                  className="size-8 fill-primary stroke-black/25 md:size-10 lg:size-12"
                />
              ))}
          </div>
        </FeatureCard>

        {/* Open source, open data */}
        <FeatureCard
          decoration={2}
          imagePosition="right"
          imageClassName="-top-25 -right-15"
          imageFit='cover'
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
