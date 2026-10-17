import { describe, expect, it } from 'bun:test';

import { buttonVariants } from '@/components/ui/button';

describe('Button variants', () => {
  it('gives ghost buttons a hover fill', () => {
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:bg-accent');
    expect(buttonVariants({ variant: 'ghost' })).not.toContain('hover:bg-none');
  });

  it('puts white text only on the solid red', () => {
    const classes = buttonVariants({ variant: 'destructive' });

    expect(classes).toContain('bg-destructive-solid');
    expect(classes).toContain('text-white');
    expect(classes).not.toMatch(/(?:^| )bg-destructive(?: |$)/);
  });

  it('colours link buttons as link text', () => {
    expect(buttonVariants({ variant: 'link' })).toContain('text-link');
    expect(buttonVariants({ variant: 'link' })).not.toContain('text-primary');
  });
});
