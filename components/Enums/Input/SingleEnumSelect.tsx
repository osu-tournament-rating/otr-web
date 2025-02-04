import { EnumMetadata, IEnumHelper } from '@/lib/enums';
import { EnumSelectProps } from '@/components/Enums/Input/types';
import { DetailedHTMLProps, SelectHTMLAttributes } from 'react';

export default function SingleEnumSelect<
  T extends number,
  M extends EnumMetadata = EnumMetadata,
>({
  enumHelper,
  showAnyOption = false,
  children,
  ...rest
}: { enumHelper: IEnumHelper<T, M> } & EnumSelectProps &
  DetailedHTMLProps<
    SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  >) {
  return (
    <select {...rest}>
      {showAnyOption && <option>Any</option>}
      {Object.entries(enumHelper.metadata).map(([k, v]) => {
        const key = Number(k);
        const { text } = v as M;

        return (
          <option key={key} value={key}>
            {text}
          </option>
        );
      })}
      {children}
    </select>
  );
}
