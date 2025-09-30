import { HelpCircle } from 'lucide-react';
import { FormLabel } from '@/components/ui/form';
import SimpleTooltip from '../simple-tooltip';

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
      <FormLabel className="text-foreground font-medium">{label}</FormLabel>
      <SimpleTooltip content={tooltip}>
        <HelpCircle className="text-primary/70 h-4 w-4" />
      </SimpleTooltip>
    </div>
  );
}
