import { DetailedHTMLProps, SelectHTMLAttributes } from 'react';

export default function FormatSelector({
  showAnyOption = false,
  ...rest
}: {
  showAnyOption?: boolean;
} & DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>) {
  return (
    <select {...rest}>
      {showAnyOption && (<option>Any</option>)}
      {[...Array(8)].map((_, i) => (
        <option key={i + 1} value={i + 1}>{`${i + 1}v${i + 1}`}</option>
      ))}
    </select>
  );
}