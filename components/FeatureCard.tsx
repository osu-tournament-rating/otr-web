import React, { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  imageUrl: string;
  imagePosition: 'left' | 'right';
  contentPosition: 'left' | 'right';
  imageTransform?: string;
  children?: ReactNode;
  className?: string;
}

export default function FeatureCard({
  title,
  description,
  imageUrl,
  imagePosition,
  contentPosition,
  imageTransform,
  children,
  className,
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
          'absolute top-0 h-[282px] w-[314px] opacity-50 transition-opacity duration-300 lg:opacity-70 xl:opacity-100',
          imagePosition === 'left' ? 'left-0' : 'right-0'
        )}
        style={imageTransform ? { transform: imageTransform } : {}}
      >
        <Image src={imageUrl} alt="" fill style={{ objectFit: 'cover' }} />
      </div>
      <div className="flex h-full flex-col items-center justify-center md:flex-row">
        <div
          className={cn(
            'z-10 flex flex-col gap-2',
            contentPosition === 'left' ? 'mr-auto md:w-1/2' : 'ml-auto md:w-2/3'
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
