'use client';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import styles from './TierSelector.module.css';

const possibleTiers = [
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

function includesMatch(array: any, match: string) {
  const result = array.filter((item: any) => item === match);
  return result == match;
}

export default function TierSelector({
  value,
  setParamsToPush,
}: {
  value: [];
  setParamsToPush: any;
}) {
  const [tiers, setTiers] = useState([]);

  const selectTier = async (tier: string) => {
    if (!includesMatch(tiers, tier)) {
      setTiers((prev: any) => [...prev, tier]);
      return setParamsToPush((prev: any) => {
        return {
          ...prev,
          tiers: [...prev.tiers, tier],
        };
      });
    }
    if (includesMatch(tiers, tier)) {
      setTiers((prev: any) => prev.filter((item: any) => item !== tier));
      return setParamsToPush((prev: any) => {
        return {
          ...prev,
          tiers: prev.tiers.filter((item) => item !== tier),
        };
      });
    }
  };

  useEffect(() => {
    setTiers(typeof value === 'string' ? [value] : (value ?? []));
  }, [value]);

  return (
    <div className={styles.container}>
      {possibleTiers.map((tier) => {
        return (
          <div
            className={styles.field}
            key={tier.id}
            onClick={async () => {
              await selectTier(tier.id);
            }}
          >
            <div
              className={clsx(
                styles.checkbox,
                includesMatch(tiers, tier.id) ? styles.selected : ''
              )}
            >
              {includesMatch(tiers, tier.id) ? (
                <FontAwesomeIcon icon={faCheck} />
              ) : (
                ''
              )}
            </div>
            <span>{tier.name}</span>
          </div>
        );
      })}
    </div>
  );
}
