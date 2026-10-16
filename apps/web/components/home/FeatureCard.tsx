import Image from 'next/image';
import React, { ReactNode } from 'react';

import { Panel } from '@/components/kit/layout/Panel';
import { cn } from '@/lib/utils';

type ImagePosition = 'left' | 'right';
type ObjectFit = 'cover' | 'contain';
type DecorationVariant = 1 | 2 | 3 | 4;

const getDecorationSrc = (decoration: DecorationVariant) => {
  return `/decorations/decoration-${decoration}.svg`;
};

interface FeatureCardProps {
  decoration: DecorationVariant;
  imagePosition?: ImagePosition;
  imageSize?: string;
  imageFit?: ObjectFit;
  imageClassName?: string;
  contentClassName?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * A home page panel with its blob artwork behind the text. The artwork has
 * fixed sizes, so these panels keep their tall padding (the one stated
 * exception to the 16px panel padding). The panel clips the art and the
 * text sits above it.
 */
function FeatureCard({
  decoration,
  imagePosition = 'left',
  imageSize = 'h-[282px] w-[314px]',
  imageFit = 'cover',
  imageClassName,
  contentClassName,
  className,
  children,
  ...rest
}: FeatureCardProps &
  Omit<React.ComponentProps<typeof Panel>, keyof FeatureCardProps>) {
  return (
    <Panel
      className={cn(
        'relative isolate flex flex-col gap-6 p-4 text-card-foreground md:p-6 lg:py-16',
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          'absolute top-0 -z-10 opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100',
          imageSize,
          imagePosition === 'left' ? 'left-0' : 'right-0',
          imageClassName
        )}
        aria-hidden="true"
      >
        <Image
          src={getDecorationSrc(decoration)}
          alt=""
          fill
          className={cn('blur-sm md:blur-none', {
            'object-cover': imageFit === 'cover',
            'object-contain': imageFit === 'contain',
          })}
        />
      </div>
      <div
        className={cn(
          'relative flex h-full flex-col items-center justify-center gap-2 text-center sm:items-start sm:text-start md:w-3/5',
          imagePosition === 'left'
            ? 'md:ml-auto md:items-end md:text-end'
            : 'md:mr-auto',
          contentClassName
        )}
      >
        {children}
      </div>
    </Panel>
  );
}

function FeatureCardTitle({
  as: Heading = 'h2',
  className,
  ...props
}: React.ComponentProps<'h2'> & { as?: 'h1' | 'h2' }) {
  return (
    <Heading
      className={cn('text-2xl leading-none font-bold md:text-3xl', className)}
      {...props}
    />
  );
}

function FeatureCardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-sm text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export { FeatureCard, FeatureCardTitle, FeatureCardDescription };
