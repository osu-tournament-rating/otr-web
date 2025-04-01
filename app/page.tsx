import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default async function Page() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main content */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col gap-24">
          {/* Hero section */}
          <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
            <div className="absolute right-0 top-0 w-[743px] h-[352px] opacity-30">
              <Image src="/decorations/decoration-2.svg" alt="" fill style={{ objectFit: 'cover' }} />
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center h-full">
              <div className="flex flex-col gap-2 max-w-xl z-10">
                <h1 className="text-5xl font-bold">Tournament rating</h1>
                <p className="text-xl text-gray-400">
                  A rating system that aims to predict your performance in tournaments relative to others
                </p>
              </div>
              <div className="flex gap-4 z-10">
                <div className="w-12 h-12 rounded-full border border-gray-700"></div>
                <div className="w-12 h-12 rounded-full border border-gray-700"></div>
                <div className="w-12 h-12 rounded-full border border-gray-700"></div>
              </div>
            </div>
          </Card>

          {/* Feature sections */}
          <div className="space-y-6">
            {/* Rank restricted tournaments */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute left-0 top-0 w-[393px] h-[352px]">
                <Image src="/decorations/decoration-1.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-end items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/3 z-10">
                  <h2 className="text-3xl font-bold">Rank restricted tournaments</h2>
                  <p className="text-gray-400">
                    oTR combined with BWS opens the door to an all-new level of
                    fair competition in tournaments targeting specific skill brackets
                  </p>
                </div>
              </div>
            </Card>

            {/* Verified tournaments */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute right-0 top-0 w-[743px] h-[352px]">
                <Image src="/decorations/decoration-2.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-start items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/3 z-10">
                  <h2 className="text-3xl font-bold">Verified tournaments</h2>
                  <p className="text-gray-400">
                    Only human-verified tournament matches are included in our rating algorithm
                  </p>
                </div>
              </div>
            </Card>

            {/* Stats on stats */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute left-0 top-0 w-[515px] h-[352px]">
                <Image src="/decorations/decoration-3.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-end items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/3 z-10">
                  <h2 className="text-3xl font-bold">Stats on stats</h2>
                  <p className="text-gray-400">
                    We have a huge assortment of tools for players and teams. Dive into all of your previous matches, 
                    compare your team to another team, see exactly how your performance has changed overtime, and so much more.
                  </p>
                </div>
              </div>
            </Card>

            {/* All modes supported */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute right-0 top-0 w-[965px] h-[352px]">
                <Image src="/decorations/decoration-4.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/3 z-10">
                  <h2 className="text-3xl font-bold">All modes supported</h2>
                  <p className="text-gray-400">
                    osu! doesn't just mean standard!
                  </p>
                </div>
                <div className="flex gap-4 z-10">
                  <div className="w-12 h-12 rounded-full border border-gray-700"></div>
                  <div className="w-12 h-12 rounded-full border border-gray-700"></div>
                  <div className="w-12 h-12 rounded-full border border-gray-700"></div>
                </div>
              </div>
            </Card>

            {/* 100% Open source */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute left-0 top-0 w-[393px] h-[352px]">
                <Image src="/decorations/decoration-1.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-end items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/3 z-10">
                  <h2 className="text-3xl font-bold">100% Open source</h2>
                  <p className="text-gray-400">
                    We are committed to remaining open source and transparent with our algorithm
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* CTA section */}
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex gap-4">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/tournaments">Browse Tournaments</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-gray-700 text-white hover:bg-gray-800">
                <Link href="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
