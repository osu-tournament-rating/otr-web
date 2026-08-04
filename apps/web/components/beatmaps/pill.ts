import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Shared geometry for the beatmap pill family (ruleset, star rating). Keeping
 * one source of truth means a pill anchored over cover art and the same pill
 * sitting on a card surface stay identical in height, radius, and icon size.
 */
export const beatmapPillVariants = cva(
  'gap-1.5 rounded-full border-transparent whitespace-nowrap',
  {
    variants: {
      size: {
        sm: 'h-6 px-2 text-xs sm:text-sm [&>svg]:size-3.5',
        md: 'h-8 px-2.5 text-sm [&>svg]:size-4',
      },
      tone: {
        /** Colors come from the caller (inline style or utility classes). */
        plain: '',
        /** On a card or panel background. */
        surface: 'bg-secondary text-secondary-foreground',
        /** On top of cover art. */
        overlay: 'border-white/15 bg-black/60 text-white backdrop-blur-sm',
      },
    },
    defaultVariants: {
      size: 'sm',
      tone: 'surface',
    },
  }
);

export type BeatmapPillVariants = VariantProps<typeof beatmapPillVariants>;
