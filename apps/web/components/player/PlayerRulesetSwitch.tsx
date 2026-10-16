'use client';

import type { Ruleset } from '@otr/core/osu';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';

import { RulesetSwitch } from '@/components/kit/lists/RulesetSwitch';

/**
 * The profile's ruleset chips. The choice lives in the address as
 * `?ruleset=`, which the page reads on the server. It is always written,
 * even for osu!, because a profile without it shows the player's own
 * default ruleset.
 */
export default function PlayerRulesetSwitch({ ruleset }: { ruleset: Ruleset }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // The chip moves at once while the next ruleset's page loads.
  const [shown, setShown] = useOptimistic(ruleset);

  return (
    <RulesetSwitch
      value={shown}
      aria-busy={isPending || undefined}
      onValueChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('ruleset', String(next));

        startTransition(() => {
          setShown(next);
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
      }}
    />
  );
}
