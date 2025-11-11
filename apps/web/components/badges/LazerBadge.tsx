import { Badge } from '@/components/ui/badge';

export interface LazerBadgeProps {
  isLazer: boolean;
}

export function LazerBadge({ isLazer }: LazerBadgeProps) {
  if (!isLazer) {
    return null;
  }

  return (
    <Badge variant="secondary" className="text-xs">
      lazer
    </Badge>
  );
}
