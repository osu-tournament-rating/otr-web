'use client';

import { DetailedHTMLProps, HTMLAttributes } from 'react';

export default function FormattedDate({
  date,
  format,
  ...rest
}: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  date: string | Date;
  format: Intl.DateTimeFormatOptions;
}) {
  return (
    <div {...rest}>{new Date(date).toLocaleDateString('en-US', format)}</div>
  );
}
