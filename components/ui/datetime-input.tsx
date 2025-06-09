import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ControllerFieldState } from 'react-hook-form';

interface DateTimeInputProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  fieldState?: ControllerFieldState;
  className?: string;
}

const inputChangedStyle = (fieldState?: ControllerFieldState) =>
  cn(
    fieldState?.isDirty &&
      !fieldState?.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

// Helper function to format date for datetime-local input (in local timezone)
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function DateTimeInput({
  value,
  onChange,
  fieldState,
  className,
}: DateTimeInputProps) {
  return (
    <Input
      className={cn(inputChangedStyle(fieldState), className)}
      type="datetime-local"
      value={value ? formatDateTimeLocal(new Date(value)) : ''}
      onChange={(e) => {
        const dateValue = e.target.value;
        if (dateValue) {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            return;
          }
          onChange(date);
        } else {
          onChange(null);
        }
      }}
    />
  );
}
