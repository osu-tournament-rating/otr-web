export default function FormattedNumber({ number }: { number: number }) {
  return <span>{number.toLocaleString('en-US')}</span>;
}
