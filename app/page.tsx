import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Trophy, BookOpen, Medal } from 'lucide-react';
import RatingLadder from '@/components/rating/RatingLadder';
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardTitle,
} from '@/components/FeatureCard';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { RulesetEnumHelper } from '@/lib/enums';

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
        <Link href="/leaderboard" className="block">
          <div className="h-full rounded-xl border border-card-alt-border bg-card-alt p-6 transition-colors hover:border-card-alt-hover hover:bg-card-alt-hover/30">
            <div className="flex items-start gap-4">
              <div className="mt-1 text-primary">
                <Medal size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">View Rankings</h3>
                <p className="mt-1 text-muted-foreground">
                  Find out where you stack up against your friends... and foes
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/tournaments" className="block">
          <div className="h-full rounded-xl border border-card-alt-border bg-card-alt p-6 transition-colors hover:border-card-alt-hover hover:bg-card-alt-hover/30">
            <div className="flex items-start gap-4">
              <div className="mt-1 text-primary">
                <Trophy size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Browse Tournaments</h3>
                <p className="mt-1 text-muted-foreground">
                  View the latest and greatest or go back in time
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="https://docs.otr.stagec.xyz"
          className="block"
          target="_blank"
        >
          <div className="h-full rounded-xl border border-card-alt-border bg-card-alt p-6 transition-colors hover:border-card-alt-hover hover:bg-card-alt-hover/30">
            <div className="flex items-start gap-4">
              <div className="mt-1 text-primary">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Read the docs</h3>
                <p className="mt-1 text-muted-foreground">
                  Learn how our rating system works
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Feature sections */}
      <div className="space-y-6">
        {/* Rating restricted tournaments */}
        <FeatureCard
          decoration={1}
          imageFit="contain"
          contentClassName="md:w-5/9 xl:w-2/3"
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
          contentClassName="md:w-2/3"
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
          imagePosition="right"
          imageSize="h-[250px] w-[618px]"
          imageClassName="scale-x-[-1]"
          contentClassName="sm:flex-row w-full md:w-full md:items-center"
        >
          <div className="flex flex-1 flex-col gap-2">
            <FeatureCardTitle>All modes supported</FeatureCardTitle>
            <FeatureCardDescription>
              Yes, mania 4K and 7K are entirely separate rulesets!
            </FeatureCardDescription>
          </div>

          <div className="flex flex-wrap justify-center gap-4 rounded-2xl bg-muted/90 p-4 backdrop-blur-md md:gap-6 md:p-6">
            {Object.keys(RulesetEnumHelper.metadata)
              .filter((r) => Number(r) !== Ruleset.ManiaOther)
              .map((r) => (
                <RulesetIcon
                  key={r}
                  ruleset={Number(r)}
                  className="size-8 fill-primary stroke-black/25 md:size-12"
                />
              ))}
          </div>
        </FeatureCard>

        {/* Open source, open data */}
        <FeatureCard decoration={1} contentClassName="md:w-2/3">
          <FeatureCardTitle>Open source, open data</FeatureCardTitle>
          <FeatureCardDescription>
            Built from the ground up with transparency in mind
          </FeatureCardDescription>
        </FeatureCard>
      </div>
    </div>
  );
}
