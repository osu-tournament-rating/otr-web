import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { SVGProps } from 'react';
import { RulesetMetadata } from '@/lib/enums';

export default function RulesetIcon({
  ruleset,
  ...rest
}: SVGProps<SVGElement> & {
  ruleset: Ruleset;
}) {
  const IconComponent = RulesetMetadata[ruleset].image;

  return <IconComponent {...rest} />;
}
