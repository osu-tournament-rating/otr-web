'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type SelectionGroupProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value?: string) => void;
  className?: string;
  children: React.ReactNode;
};

type SelectionGroupItemProps = {
  value?: string;
  className?: string;
  children: React.ReactNode;
};

const SelectionGroupContext = React.createContext<{
  value: string | undefined;
  onValueChange: (value?: string) => void;
}>({
  value: undefined,
  onValueChange: () => {},
});

const SelectionGroup = React.forwardRef<HTMLDivElement, SelectionGroupProps>(
  (
    { defaultValue, value, onValueChange, className, children, ...props },
    ref
  ) => {
    const [selectedValue, setSelectedValue] = React.useState<
      string | undefined
    >(defaultValue);

    // Use controlled value if provided
    const currentValue = value !== undefined ? value : selectedValue;

    const handleValueChange = React.useCallback(
      (value?: string) => {
        if (onValueChange) {
          onValueChange(value);
        } else {
          setSelectedValue(value);
        }
      },
      [onValueChange]
    );

    return (
      <SelectionGroupContext.Provider
        value={{
          value: currentValue,
          onValueChange: handleValueChange,
        }}
      >
        <div
          ref={ref}
          className={cn('flex items-center justify-start gap-1', className)}
          {...props}
        >
          {children}
        </div>
      </SelectionGroupContext.Provider>
    );
  }
);
SelectionGroup.displayName = 'SelectionGroup';

const SelectionGroupItem = React.forwardRef<
  HTMLButtonElement,
  SelectionGroupItemProps
>(({ value, className, children, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = React.useContext(
    SelectionGroupContext
  );
  const isSelected = selectedValue === value;

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-transparent hover:bg-muted hover:text-muted-foreground',
        className
      )}
      onClick={() => onValueChange(value)}
      data-state={isSelected ? 'on' : 'off'}
      {...props}
    >
      {children}
    </button>
  );
});
SelectionGroupItem.displayName = 'SelectionGroupItem';

export { SelectionGroup, SelectionGroupItem };
