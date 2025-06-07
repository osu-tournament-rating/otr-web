import Image from 'next/image';
import SimpleTooltip from '@/components/simple-tooltip';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CountryFlagProps {
  country: string;
  className?: string;
  width?: number;
  height?: number;
  showTooltip?: boolean;
  tooltipContent?: ReactNode;
}

export default function CountryFlag({
  country,
  className,
  width = 20,
  height = 14,
  showTooltip = true,
  tooltipContent,
}: CountryFlagProps) {
  const flag = (
    <Image
      src={`https://assets.ppy.sh/old-flags/${country}.png`}
      alt={`${country} flag`}
      className={cn('rounded-sm shadow-sm', className)}
      width={width}
      height={height}
    />
  );

  if (!showTooltip) {
    return flag;
  }

  return (
    <SimpleTooltip content={tooltipContent || country}>{flag}</SimpleTooltip>
  );
}
