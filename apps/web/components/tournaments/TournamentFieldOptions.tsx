'use client';

import { Ruleset } from '@otr/core/osu';
import type * as React from 'react';

import {
  LOBBY_SIZES,
  TOURNAMENT_REJECTION_REASONS,
  toFlagMask,
} from '@/app/tournaments/list-params';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { ChoiceChip } from '@/components/kit/lists/ChoiceChip';
import { VerificationStatusGlyph } from '@/components/kit/status/VerificationStatusIcon';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { TOURNAMENT_REJECTION_REASON_LABELS } from '@/lib/kit/format/enum-labels';
import { formatLobbySize } from '@/lib/kit/format/fields';
import { RATED_RULESETS, getRulesetLabel } from '@/lib/kit/format/ruleset';
import {
  VERIFICATION_STATUS_ORDER,
  getVerificationStatusName,
} from '@/lib/kit/status/verification';
import { cn } from '@/lib/utils';

/**
 * The rulesets a tournament can be in. Admin pickers also offer
 * `mania (other)`, which the rated lists leave out.
 */
export function RulesetSelectContent({
  includeManiaOther = false,
}: {
  includeManiaOther?: boolean;
}) {
  const rulesets = includeManiaOther
    ? [...RATED_RULESETS, Ruleset.ManiaOther]
    : RATED_RULESETS;

  return (
    <SelectContent>
      {rulesets.map((ruleset) => (
        <SelectItem key={ruleset} value={String(ruleset)}>
          <RulesetIcon
            ruleset={ruleset}
            aria-hidden="true"
            className="size-4 fill-current text-muted-foreground"
          />
          {getRulesetLabel(ruleset)}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

/** Lobby sizes from 1v1 to 8v8. */
export function LobbySizeSelectContent() {
  return (
    <SelectContent>
      {LOBBY_SIZES.map((size) => (
        <SelectItem key={size} value={String(size)}>
          {formatLobbySize(size)}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

/** The five verification states, in display order, with their glyphs. */
export function VerificationStatusSelectContent() {
  return (
    <SelectContent>
      {VERIFICATION_STATUS_ORDER.map((status) => (
        <SelectItem key={status} value={String(status)}>
          <VerificationStatusGlyph status={status} className="size-4" />
          {getVerificationStatusName(status)}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

/**
 * A tournament's rejection reasons as chips that each switch one flag, for a
 * form field. `value` is the stored bitmask.
 */
export function RejectionReasonChips({
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onChange' | 'children'> & {
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div
      role="group"
      className={cn('flex flex-wrap gap-1.5', className)}
      {...props}
    >
      {TOURNAMENT_REJECTION_REASONS.map((reason) => {
        const selected = (value & reason) === reason;
        return (
          <ChoiceChip
            key={reason}
            selected={selected}
            onClick={() => {
              const flags = TOURNAMENT_REJECTION_REASONS.filter((flag) =>
                flag === reason ? !selected : (value & flag) === flag
              );
              onValueChange(toFlagMask(flags));
            }}
          >
            {TOURNAMENT_REJECTION_REASON_LABELS[reason]}
          </ChoiceChip>
        );
      })}
    </div>
  );
}
