import React from 'react';
import TierCard from './TierCard';
import { tierData } from '@/lib/tierData';

export default function RatingLadder() {
  return (
    <div
      className={
        'grid xl:grid-flow-col grid-cols-2 sm:grid-cols-3 xl:auto-cols-fr gap-2 rounded-2xl border border-white/5 bg-card p-4 backdrop-blur-sm'
      }
    >
      {/* All tiers in a responsive grid layout */}
      {tierData.map((item) => (
        <TierCard
          key={item.tier}
          tier={item.tier}
          displayName={item.displayName}
          rating={item.baseRating}
          iconSize={40}
          className='last:col-[1/-1] last:sm:col-auto'
        />
      ))}
    </div>
  );
}
