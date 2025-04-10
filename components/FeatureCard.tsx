import React, { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ImagePosition = 'left' | 'right';
type ObjectFit = 'cover' | 'contain';
type DecorationVariant = 1 | 2 | 3 | 4;

const getDecorationSrc = (decoration: DecorationVariant) => {
  return `/decorations/decoration-${decoration}.svg`
}

interface FeatureCardProps {
  /** Main card title */
  title: string;

  /** Subtext content */
  description: string;

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

export default function FeatureCard({
  title,
  description,
  decoration,
  imagePosition = 'left',
  imageSize = 'h-[282px] w-[314px]',
  imageFit = 'cover',
  imageClassName,
  contentClassName,
  className,
  children,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        'relative h-44 overflow-hidden border-none bg-card-alt p-4 md:h-64 md:p-6 lg:p-8',
        className
      )}
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
          className={cn({
            'object-cover': imageFit === 'cover',
            'object-contain': imageFit === 'contain',
          })}
        />
      </div>
      <div className="flex h-full flex-col items-center justify-center md:flex-row">
        <div
          className={cn(
            'z-10 flex flex-col gap-2',
            imagePosition === 'left' ? 'ml-auto md:w-2/3' : 'mr-auto md:w-1/2',
            contentClassName
          )}
        >
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          <p className="text-foreground/90 transition-colors duration-300 md:text-foreground/80 lg:text-secondary-foreground xl:text-muted-foreground">
            {description}
          </p>
          {children}
        </div>
      </div>
    </Card>
  );
}
