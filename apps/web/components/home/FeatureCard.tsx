import React, { ReactNode } from 'react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ImagePosition = 'left' | 'right';
type ObjectFit = 'cover' | 'contain';
type DecorationVariant = 1 | 2 | 3 | 4;

const getDecorationSrc = (decoration: DecorationVariant) => {
  return `/decorations/decoration-${decoration}.svg`;
};

interface FeatureCardProps {
  /** Decoration identifier */
  decoration: DecorationVariant;

  /** Position of the background image */
  imagePosition?: ImagePosition;

  /** Tailwind classes for image dimensions */
  imageSize?: string;

  /** CSS object-fit property for image */
  imageFit?: ObjectFit;

  /** Additional classes for image container */
  imageClassName?: string;

  /** Additional classes for content container */
  contentClassName?: string;

  /** Additional classes for root element */
  className?: string;

  /** Optional child elements */
  children?: ReactNode;
}

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
}: FeatureCardProps & React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-none p-4 md:p-6 lg:py-16',
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          'absolute top-0 opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100',
          imageSize,
          imagePosition === 'left' ? 'left-0' : 'right-0',
          imageClassName
        )}
        aria-hidden="true"
      >
        <Image
          src={getDecorationSrc(decoration)}
          alt={'Decorative background pattern'}
          fill
          className={cn('blur-sm md:blur-none', {
            'object-cover': imageFit === 'cover',
            'object-contain': imageFit === 'contain',
          })}
        />
      </div>
      <div
        className={cn(
          'z-10 flex h-full flex-col items-center justify-center gap-2 text-center sm:items-start sm:text-start md:w-3/5',
          imagePosition === 'left'
            ? 'md:ml-auto md:items-end md:text-end'
            : 'md:mr-auto',
          contentClassName
        )}
      >
        {children}
      </div>
    </Card>
  );
}

function FeatureCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return (
    <CardTitle
      className={cn('text-2xl font-bold md:text-3xl', className)}
      {...props}
    />
  );
}

function FeatureCardDescription({
  className,
  ...props
}: React.ComponentProps<typeof CardDescription>) {
  return (
    <CardDescription
      className={cn(
        'text-foreground/90 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground transition-colors duration-300',
        className
      )}
      {...props}
    />
  );
}

export { FeatureCard, FeatureCardTitle, FeatureCardDescription };
