'use client';

export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_IS_STAGING !== 'true') {
    return null;
  }

  return (
    <div className="w-full border-b border-amber-500/50 bg-amber-500/20 py-1 text-center">
      <p className="font-mono text-xs text-amber-700 dark:text-amber-300">
        This is a pre-production instance. Data may be erased or modified
        without warning.
      </p>
    </div>
  );
}
