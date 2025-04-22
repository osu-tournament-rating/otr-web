import AllRuleset from '@/public/icons/rulesets/all.svg';
import Standard from '@/public/icons/rulesets/osu.svg';
import Taiko from '@/public/icons/rulesets/taiko.svg';
import Catch from '@/public/icons/rulesets/catch.svg';
import Mania from '@/public/icons/rulesets/mania.svg';
import Mania4k from '@/public/icons/rulesets/mania4k.svg';
import Mania7k from '@/public/icons/rulesets/mania7k.svg';
import { FC, SVGProps } from 'react';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';

const iconMap = {
  [Ruleset.Osu]: Standard,
  [Ruleset.Taiko]: Taiko,
  [Ruleset.Catch]: Catch,
  [Ruleset.ManiaOther]: Mania,
  [Ruleset.Mania4k]: Mania4k,
  [Ruleset.Mania7k]: Mania7k,
} satisfies { [key in Ruleset]: FC<SVGProps<SVGElement>> };

export default function RulesetIcon({
  ruleset,
  ...rest
}: { ruleset: Ruleset | 'all' } & SVGProps<SVGElement>) {
  const Icon = ruleset === 'all' ? AllRuleset : iconMap[ruleset];

  return <Icon {...rest} />;
}
