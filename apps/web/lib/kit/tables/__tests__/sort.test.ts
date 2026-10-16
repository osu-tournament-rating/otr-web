import { describe, expect, it } from 'bun:test';

import { sortRows } from '../sort';

describe('sortRows', () => {
  type Row = {
    id: number;
    name: string;
    rating: number | null;
    joined?: Date;
  };
  const rows: Row[] = [
    { id: 1, name: 'mrekk', rating: 3121 },
    { id: 2, name: 'Accolibed', rating: null },
    { id: 3, name: 'lifeline', rating: 3045 },
    { id: 4, name: 'player10', rating: 3045 },
    { id: 5, name: 'player9', rating: Number.NaN },
  ];
  const accessors = {
    rating: (row: Row) => row.rating,
    name: (row: Row) => row.name,
  };
  const ids = (list: Row[]) => list.map((row) => row.id);

  it('sorts numbers both ways and keeps ties in their order', () => {
    expect(
      ids(sortRows(rows, { key: 'rating', direction: 'desc' }, accessors))
    ).toEqual([1, 3, 4, 2, 5]);
    expect(
      ids(sortRows(rows, { key: 'rating', direction: 'asc' }, accessors))
    ).toEqual([3, 4, 1, 2, 5]);
  });

  it('puts missing values last in both directions', () => {
    const asc = sortRows(rows, { key: 'rating', direction: 'asc' }, accessors);
    expect(ids(asc).slice(-2)).toEqual([2, 5]);
  });

  it('orders names without regard to case, with numbers in order', () => {
    expect(
      sortRows(rows, { key: 'name', direction: 'asc' }, accessors).map(
        (row) => row.name
      )
    ).toEqual(['Accolibed', 'lifeline', 'mrekk', 'player9', 'player10']);
  });

  it('sorts dates', () => {
    const dated: Row[] = [
      { id: 1, name: 'a', rating: 0, joined: new Date('2024-07-20') },
      { id: 2, name: 'b', rating: 0, joined: new Date('2023-01-01') },
      { id: 3, name: 'c', rating: 0, joined: new Date('invalid') },
    ];
    expect(
      ids(
        sortRows(
          dated,
          { key: 'joined', direction: 'asc' },
          { joined: (row: Row) => row.joined }
        )
      )
    ).toEqual([2, 1, 3]);
  });

  it('returns a new array and leaves the input alone', () => {
    const input = [...rows];
    const sorted = sortRows(
      input,
      { key: 'rating', direction: 'asc' },
      accessors
    );
    expect(sorted).not.toBe(input);
    expect(ids(input)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns the rows unchanged for a key with no accessor', () => {
    expect(
      ids(
        sortRows(
          rows,
          { key: 'missing' as 'rating', direction: 'asc' },
          accessors
        )
      )
    ).toEqual([1, 2, 3, 4, 5]);
  });
});
