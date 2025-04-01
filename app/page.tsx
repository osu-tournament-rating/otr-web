import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Trophy, Flag, BookOpen } from 'lucide-react';
import RatingLadder from '@/components/rating/RatingLadder';

export default async function Page() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-2">
          {/* Hero section */}
          <Card className="relative mb-4 overflow-hidden border-none bg-card-alt p-6 md:p-8">
            <div className="absolute -top-16 right-0 h-[225px] w-[475px] opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100">
              <Image
                src="/decorations/decoration-2.svg"
                alt=""
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className="flex flex-col items-center gap-6 md:h-full md:flex-row md:justify-between">
              <div className="z-10 flex max-w-md flex-col gap-2">
                <h1 className="text-2xl font-bold">osu! Tournament Rating</h1>
                <p className="text-md text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground">
                  A platform that ranks and predicts the performance of all osu!
                  tournament players
                </p>
              </div>
            </div>
          </Card>

          {/* Rating Ladder */}
          <Card className="mb-4 border-none bg-card-alt p-6 md:p-8">
            <div className="mb-4 flex flex-col gap-2">
              <h2 className="text-3xl font-bold">Rise to the top</h2>
              <p className="text-muted-foreground">
                Join your friends on the ladder as soon as you play in a
                verified tournament!
              </p>
            </div>
            <RatingLadder className="w-full" iconSize={40} />
          </Card>

          {/* Link cards */}
          <div className="mb-4 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link href="/tournaments" className="block">
              <div className="h-full rounded-xl border border-card-alt-border bg-card-alt p-6 transition-colors hover:border-card-alt-hover hover:bg-card-alt-hover/30">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-primary">
                    <Flag size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      Browse Tournaments
                    </h3>
                    <p className="mt-1 text-muted-foreground">
                      View the latest and greatest or go back in time
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/leaderboard" className="block">
              <div className="h-full rounded-xl border border-card-alt-border bg-card-alt p-6 transition-colors hover:border-card-alt-hover hover:bg-card-alt-hover/30">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-primary">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">View Rankings</h3>
                    <p className="mt-1 text-muted-foreground">
                      Find out where you stack up against your friends...and
                      foes
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
            {/* Rank restricted tournaments */}
            <Card className="relative h-44 overflow-hidden border-none bg-card-alt p-4 md:h-64 md:p-6 lg:p-8">
              <div className="absolute top-0 left-0 h-[282px] w-[314px] opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100">
                <Image
                  src="/decorations/decoration-1.svg"
                  alt=""
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-center md:flex-row">
                <div className="z-10 ml-auto flex flex-col gap-2 md:w-2/3">
                  <h2 className="text-2xl font-bold md:text-3xl">
                    Rank restricted tournaments
                  </h2>
                  <p className="text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground">
                    oTR combined with BWS opens the door to an all-new level of
                    fair competition in tournaments targeting specific skill
                    brackets
                  </p>
                </div>
              </div>
            </Card>

            {/* Verified tournaments */}
            <Card className="relative h-44 overflow-hidden border-none bg-card-alt p-4 md:h-64 md:p-6 lg:p-8">
              <div className="absolute top-0 right-0 h-[260px] w-[600px] opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100">
                <Image
                  src="/decorations/decoration-2.svg"
                  alt=""
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-center md:flex-row">
                <div className="z-10 mr-auto flex flex-col gap-2 md:w-1/2">
                  <h2 className="text-2xl font-bold md:text-3xl">
                    Verified tournaments
                  </h2>
                  <p className="text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground">
                    Only human-verified tournament matches are included in our
                    rating algorithm
                  </p>
                </div>
              </div>
            </Card>

            {/* Stats on stats */}
            <Card className="relative h-44 overflow-hidden border-none bg-card-alt p-4 md:h-64 md:p-6 lg:p-8">
              <div className="absolute top-0 -left-50 h-[260px] w-[600px] opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100">
                <Image
                  src="/decorations/decoration-2.svg"
                  alt=""
                  fill
                  style={{
                    objectFit: 'cover',
                    transform: 'rotate(180deg)',
                  }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-center md:flex-row">
                <div className="z-10 ml-auto flex flex-col gap-2 md:w-2/3">
                  <h2 className="text-2xl font-bold md:text-3xl">
                    Stats on stats
                  </h2>
                  <p className="text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground">
                    Powerful tools for players and teams. Compare performance,
                    track progress, and analyze your tournament history with
                    ease.
                  </p>
                </div>
              </div>
            </Card>

            {/* All modes supported */}
            <Card className="relative h-44 overflow-hidden border-none bg-card-alt p-4 md:h-64 md:p-6 lg:p-8">
              <div
                className="absolute top-0 right-0 h-[225px] w-[618px] opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100"
                style={{
                  transform: 'scaleX(-1) scale(0.85)',
                  transformOrigin: 'right top',
                }}
              >
                <Image
                  src="/decorations/decoration-4.svg"
                  alt=""
                  fill
                  style={{
                    objectFit: 'contain',
                    right: '0',
                    left: 'auto',
                  }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-center md:flex-row md:justify-between">
                <div className="z-10 mr-auto flex flex-col gap-2 md:w-2/5">
                  <h2 className="text-2xl font-bold md:text-3xl">
                    All modes supported
                  </h2>
                  <p className="text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground">
                    Yes, mania 4K and 7K are entirely separate rulesets!
                  </p>
                </div>
                <div className="z-10 mt-4 flex flex-wrap gap-2 rounded-2xl bg-muted p-2 md:gap-4 md:p-4">
                  <div className="flex h-8 w-8 items-center justify-center md:h-12 md:w-12">
                    <Image
                      src="/icons/rulesets/osu.svg"
                      alt="osu!"
                      width={32}
                      height={32}
                      className="fill-muted-foreground md:h-12 md:w-12"
                    />
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center md:h-12 md:w-12">
                    <Image
                      src="/icons/rulesets/taiko.svg"
                      alt="osu!taiko"
                      width={32}
                      height={32}
                      className="fill-muted-foreground md:h-12 md:w-12"
                    />
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center md:h-12 md:w-12">
                    <Image
                      src="/icons/rulesets/catch.svg"
                      alt="osu!catch"
                      width={32}
                      height={32}
                      className="fill-muted-foreground md:h-12 md:w-12"
                    />
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center md:h-12 md:w-12">
                    <Image
                      src="/icons/rulesets/mania4k.svg"
                      alt="osu!mania 4K"
                      width={32}
                      height={32}
                      className="fill-muted-foreground md:h-12 md:w-12"
                    />
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center md:h-12 md:w-12">
                    <Image
                      src="/icons/rulesets/mania7k.svg"
                      alt="osu!mania 7K"
                      width={32}
                      height={32}
                      className="fill-muted-foreground md:h-12 md:w-12"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 100% Open source */}
            <Card className="relative h-44 overflow-hidden border-none bg-card-alt p-4 md:h-64 md:p-6 lg:p-8">
              <div className="absolute top-0 left-0 h-[282px] w-[314px] opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100">
                <Image
                  src="/decorations/decoration-1.svg"
                  alt=""
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-center md:flex-row">
                <div className="z-10 ml-auto flex flex-col gap-2 md:w-2/3">
                  <h2 className="text-2xl font-bold md:text-3xl">
                    100% Open source
                  </h2>
                  <p className="text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground">
                    We are committed to remaining open source and transparent
                    with our algorithm
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* CTA section removed from here and moved to top */}
        </div>
      </div>
    </div>
  );
}
