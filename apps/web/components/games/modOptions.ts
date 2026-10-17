import { Mods } from '@otr/core/osu';

import type { Option } from '@/components/select/multiple-select';
import { ModsEnumHelper } from '@/lib/enum-helpers';

/** Every mod for the game and score edit dialogs: "Hidden (HD)", A to Z. */
export const modOptions: Option[] = Object.entries(ModsEnumHelper.metadata)
  .filter(([value, { text }]) => !!text && value !== Mods.None.toString())
  .map(([value, { text, description }]) => ({
    label: description
      ? `${description.charAt(0).toUpperCase() + description.slice(1)} (${text})`
      : text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'en-US'));
