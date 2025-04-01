import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Trophy, Flag, BookOpen } from 'lucide-react';
import RatingLadder from '@/components/rating/RatingLadder';

export default async function Page() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main content */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col gap-8">
          {/* Hero section */}
          <Card className="relative overflow-hidden border-none bg-neutral-900 p-6 md:p-8">
            <div className="flex flex-col items-center gap-6 md:h-full md:flex-row md:justify-between">
              <div className="z-10 flex max-w-md flex-col gap-2">
                <h1 className="text-3xl font-bold">Tournament rating</h1>
                <p className="text-xl text-gray-400">
                  A rating system that aims to predict your performance in
                  tournaments relative to others
                </p>
              </div>
            </div>
          </Card>

          {/* Rating Ladder - Full width */}
          <RatingLadder className="w-full" iconSize={36} />

          {/* CTA section - elegant cards */}
          <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-3">
            <Link href="/tournaments" className="block">
              <div className="h-full rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-neutral-700">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-blue-500">
                    <Flag size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      Browse Tournaments
                    </h3>
                    <p className="mt-1 text-gray-400">
                      Submit and track your tournament reports
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/leaderboard" className="block">
              <div className="h-full rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-neutral-700">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-blue-500">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">View Rankings</h3>
                    <p className="mt-1 text-gray-400">
                      Check player rankings and stats
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/docs" className="block">
              <div className="h-full rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-neutral-700">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-blue-500">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Read the docs</h3>
                    <p className="mt-1 text-gray-400">
                      Learn how the rating system works
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Feature sections */}
          <div className="space-y-10">
            {/* Rank restricted tournaments */}
            <Card className="relative h-64 overflow-hidden border-none bg-neutral-900 p-8">
              <div className="absolute top-0 left-0 h-[282px] w-[314px]">
                <Image
                  src="/decorations/decoration-1.svg"
                  alt=""
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-end md:flex-row">
                <div className="z-10 ml-auto flex flex-col gap-2 md:w-2/3">
                  <h2 className="text-3xl font-bold">
                    Rank restricted tournaments
                  </h2>
                  <p className="text-gray-400">
                    oTR combined with BWS opens the door to an all-new level of
                    fair competition in tournaments targeting specific skill
                    brackets
                  </p>
                </div>
              </div>
            </Card>

            {/* Verified tournaments */}
            <Card className="relative h-64 overflow-hidden border-none bg-neutral-900 p-8">
              <div className="absolute top-0 right-0 h-[225px] w-[475px]">
                <Image
                  src="/decorations/decoration-2.svg"
                  alt=""
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-start md:flex-row">
                <div className="z-10 mr-auto flex flex-col gap-2 md:w-1/2">
                  <h2 className="text-3xl font-bold">Verified tournaments</h2>
                  <p className="text-gray-400">
                    Only human-verified tournament matches are included in our
                    rating algorithm
                  </p>
                </div>
              </div>
            </Card>

            {/* Stats on stats */}
            <Card className="relative h-64 overflow-hidden border-none bg-neutral-900 p-8">
              <div className="absolute top-0 left-0 h-[225px] w-[330px]">
                <Image
                  src="/decorations/decoration-3.svg"
                  alt=""
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-end md:flex-row">
                <div className="z-10 ml-auto flex flex-col gap-2 md:w-1/2">
                  <h2 className="text-3xl font-bold">Stats on stats</h2>
                  <p className="text-gray-400">
                    Powerful tools for players and teams. Compare performance,
                    track progress, and analyze your tournament history with
                    ease.
                  </p>
                </div>
              </div>
            </Card>

            {/* All modes supported */}
            <Card className="relative h-64 overflow-hidden border-none bg-neutral-900 p-8">
              <div
                className="absolute top-0 right-0 h-[225px] w-[618px]"
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
              <div className="flex h-full flex-col items-center justify-between md:flex-row">
                <div className="z-10 mr-auto flex flex-col gap-2 md:w-2/5">
                  <h2 className="text-3xl font-bold">All modes supported</h2>
                  <p className="text-gray-400">
                    osu! doesn&apos;t just mean standard!
                  </p>
                </div>
                <div className="z-10 flex gap-4">
                  <div className="h-12 w-12 rounded-full border border-gray-700"></div>
                  <div className="h-12 w-12 rounded-full border border-gray-700"></div>
                  <div className="h-12 w-12 rounded-full border border-gray-700"></div>
                </div>
              </div>
            </Card>

            {/* 100% Open source */}
            <Card className="relative h-64 overflow-hidden border-none bg-neutral-900 p-8">
              <div className="absolute top-0 left-0 h-[282px] w-[314px]">
                <Image
                  src="/decorations/decoration-1.svg"
                  alt=""
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="flex h-full flex-col items-center justify-end md:flex-row">
                <div className="z-10 ml-auto flex flex-col gap-2 md:w-2/3">
                  <h2 className="text-3xl font-bold">100% Open source</h2>
                  <p className="text-gray-400">
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
