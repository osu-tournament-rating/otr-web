import React, { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  imageUrl: string;
  imagePosition?: 'left' | 'right';
  imageSize?: string;
  imageAlt?: string;
  imageClassName?: string;
  contentClassName?: string;
  className?: string;
  children?: ReactNode;
}

export default function FeatureCard({
  title,
  description,
  imageUrl,
  imagePosition = 'left',
  imageSize = 'h-[282px] w-[314px]',
  imageAlt = 'Decorative background',
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
      >
        <Image 
          src={imageUrl} 
          alt={imageAlt} 
          fill 
          style={{ objectFit: 'cover' }} 
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
