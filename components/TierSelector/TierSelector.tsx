'use client';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import styles from './TierSelector.module.css';

const possibleRanks = [
  {
    id: 'bronze',
    name: 'Bronze',
  },
  {
    id: 'silver',
    name: 'Silver',
  },
  {
    id: 'gold',
    name: 'Gold',
  },
  {
    id: 'platinum',
    name: 'Platinum',
  },
  {
    id: 'emerald',
    name: 'Emerald',
  },
  {
    id: 'diamond',
    name: 'Diamond',
  },
  {
    id: 'master',
    name: 'Master',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
  },
  {
    id: 'elite-grandmaster',
    name: 'Elite Grandmaster',
  },
];

export default function TierSelector({
  value,
  setParamsToPush,
}: {
  value: {};
  setParamsToPush: any;
}) {
  const [ranks, setRanks] = useState([]);
  const [excludedRanks, setExcludedRanks] = useState([]);

  const selectRank = async (rank: string) => {
    if (!ranks.includes(rank) && !excludedRanks.includes(rank)) {
      setRanks((prev: any) => [...prev, rank]);
      return setParamsToPush((prev: any) => ({
        ...prev,
        inclTier: [...prev.inclTier, rank],
      }));
    }
    if (ranks.includes(rank)) {
      setExcludedRanks((prev: any) => [...prev, rank]);
      setParamsToPush((prev: any) => ({
        ...prev,
        exclTier: [...prev.exclTier, rank],
      }));
      setRanks((prev: any) => prev.filter((item: any) => item !== rank));
      return setParamsToPush((prev: any) => ({
        ...prev,
        inclTier: [
          ...prev.inclTier.slice(
            0,
            prev.inclTier.findIndex((name) => name === rank)
          ),
          ...prev.inclTier.slice(
            prev.inclTier.findIndex((name) => name === rank) + 1
          ),
        ],
      }));
    }
    if (excludedRanks.includes(rank)) {
      setExcludedRanks((prev: any) =>
        prev.filter((item: any) => item !== rank)
      );
      return setParamsToPush((prev: any) => ({
        ...prev,
        exclTier: [
          ...prev.exclTier.slice(
            0,
            prev.exclTier.findIndex((name) => name === rank)
          ),
          ...prev.exclTier.slice(
            prev.exclTier.findIndex((name) => name === rank) + 1
          ),
        ],
      }));
    }
  };

  useEffect(() => {
    setRanks(value?.inclTier ?? []);
    setExcludedRanks(value?.exclTier ?? []);
  }, [value.inclTier, value.exclTier]);

  return (
    <div className={styles.container}>
      {possibleRanks.map((rank) => {
        return (
          <div
            className={styles.field}
            key={rank.id}
            onClick={async () => {
              await selectRank(rank.id);
            }}
          >
            <div
              className={clsx(
                styles.checkbox,
                ranks.includes(rank.id)
                  ? styles.selected
                  : excludedRanks.includes(rank.id)
                  ? styles.excluded
                  : ''
              )}
            >
              {ranks.includes(rank.id) ? (
                <FontAwesomeIcon icon={faCheck} />
              ) : excludedRanks.includes(rank.id) ? (
                <FontAwesomeIcon icon={faXmark} />
              ) : (
                ''
              )}
            </div>
            <span>{rank.name}</span>
          </div>
        );
      })}
    </div>
  );
}
