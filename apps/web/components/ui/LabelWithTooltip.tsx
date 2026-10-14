import { HelpCircle } from 'lucide-react';
import { FormLabel } from '@/components/ui/form';
import TapTooltip from '../tap-tooltip';

type LabelWithTooltipProps = {
  label: string;
  tooltip: string;
};

export default function LabelWithTooltip({
  label,
  tooltip,
}: LabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-2">
      <FormLabel className="font-medium text-foreground">{label}</FormLabel>
      <TapTooltip
        side="top"
        content={tooltip}
        triggerAriaLabel={`About ${label.replace(/\s*\*$/, '')}`}
        triggerClassName="flex w-auto shrink-0 items-center rounded-full"
      >
        <HelpCircle className="h-4 w-4 text-primary/70" aria-hidden />
      </TapTooltip>
    </div>
  );
}
