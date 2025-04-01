import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Trophy, Flag, BookOpen } from 'lucide-react';

export default async function Page() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main content */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col gap-8">
          {/* Hero section */}
          <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
            <div className="absolute right-0 top-0 w-[475px] h-[225px] opacity-40">
              <Image src="/decorations/decoration-2.svg" alt="" fill style={{ objectFit: 'cover' }} />
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center h-full">
              <div className="flex flex-col gap-2 max-w-md z-10 mr-auto">
                <h1 className="text-3xl font-bold">Tournament rating</h1>
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

          {/* CTA section - elegant cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            <Link href="/tournaments" className="block">
              <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-neutral-700 transition-colors h-full">
                <div className="flex items-start gap-4">
                  <div className="text-blue-500 mt-1">
                    <Flag size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Browse Tournaments</h3>
                    <p className="text-gray-400 mt-1">Submit and track your tournament reports</p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/leaderboard" className="block">
              <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-neutral-700 transition-colors h-full">
                <div className="flex items-start gap-4">
                  <div className="text-blue-500 mt-1">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">View Rankings</h3>
                    <p className="text-gray-400 mt-1">Check player rankings and stats</p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/docs" className="block">
              <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-neutral-700 transition-colors h-full">
                <div className="flex items-start gap-4">
                  <div className="text-blue-500 mt-1">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Read the docs</h3>
                    <p className="text-gray-400 mt-1">Learn how the rating system works</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Feature sections */}
          <div className="space-y-10">
            {/* Rank restricted tournaments */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute left-0 top-0 w-[314px] h-[282px]">
                <Image src="/decorations/decoration-1.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-end items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/3 z-10 ml-auto">
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
              <div className="absolute right-0 top-0 w-[475px] h-[225px]">
                <Image src="/decorations/decoration-2.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-start items-center h-full">
                <div className="flex flex-col gap-2 md:w-1/2 z-10 mr-auto">
                  <h2 className="text-3xl font-bold">Verified tournaments</h2>
                  <p className="text-gray-400">
                    Only human-verified tournament matches are included in our rating algorithm
                  </p>
                </div>
              </div>
            </Card>

            {/* Stats on stats */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute left-0 top-0 w-[330px] h-[225px]">
                <Image src="/decorations/decoration-3.svg" alt="" fill style={{ objectFit: 'contain' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-end items-center h-full">
                <div className="flex flex-col gap-2 md:w-1/2 z-10 ml-auto">
                  <h2 className="text-3xl font-bold">Stats on stats</h2>
                  <p className="text-gray-400">
                    Powerful tools for players and teams. Compare performance, track progress, 
                    and analyze your tournament history with ease.
                  </p>
                </div>
              </div>
            </Card>

            {/* All modes supported */}
            <Card className="relative overflow-hidden bg-neutral-900 border-none p-8 h-64">
              <div className="absolute right-0 top-0 w-[618px] h-[225px]" style={{ transform: 'scaleX(-1) scale(0.85)', transformOrigin: 'right top' }}>
                <Image 
                  src="/decorations/decoration-4.svg" 
                  alt="" 
                  fill 
                  style={{ 
                    objectFit: 'contain',
                    right: '0',
                    left: 'auto'
                  }} 
                />
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/5 z-10 mr-auto">
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
              <div className="absolute left-0 top-0 w-[314px] h-[282px]">
                <Image src="/decorations/decoration-1.svg" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex flex-col md:flex-row justify-end items-center h-full">
                <div className="flex flex-col gap-2 md:w-2/3 z-10 ml-auto">
                  <h2 className="text-3xl font-bold">100% Open source</h2>
                  <p className="text-gray-400">
                    We are committed to remaining open source and transparent with our algorithm
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
