'use client';

import { search } from '@/app/actions/search';
import SearchIcon from '@/public/icons/search.svg';
import { useClickAway } from '@uidotdev/usehooks';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './SearchBar.module.css';

const initialState = {
  search: undefined,
};

const containerMotionStates = {
  initial: {
    backgroundColor: 'hsla(0, 0%, 0%, 0)',
    transition: {
      delay: 0.15,
    },
  },
  animate: {
    backgroundColor: 'hsla(0, 0%, 0%, 0.8)',
  },
};

const bodyMotionStates = {
  initial: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.15,
    },
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1,
      duration: 0.2,
    },
  },
};

const bodyContentMotionStates = {
  initial: {
    opacity: 0,
    x: -10,
  },
  animate: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: 0.15 * index,
      ease: 'easeOut',
    },
  }),
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.3,
      delay: 0.15,
      ease: 'easeOut',
    },
  },
};

const mode: { [key: number]: string } = {
  0: 'std',
  1: 'taiko',
  2: 'ctb',
  3: 'mania',
};

const highlightMatch = (text: string, query: string) => {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <span>{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </>
  );
};

export default function SearchBar({
  setIsSeachBarOpen,
}: {
  setIsSeachBarOpen: (isOpen: boolean) => void;
}) {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState(initialState.search);
  const [isLoading, setIsLoading] = useState(false);

  const ref = useClickAway(() => {
    setIsSeachBarOpen(false);
  });

  useEffect(() => {
    if (searchValue.length < 3) {
      setSearchResults(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      const results = await search({ searchKey: searchValue });
      setSearchResults(results);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [searchValue]);

  return (
    <motion.div
      className={styles.container}
      initial={containerMotionStates.initial}
      animate={containerMotionStates.animate}
      exit={containerMotionStates.initial}
    >
      <motion.div
        className={styles.body}
        ref={ref}
        initial={bodyMotionStates.initial}
        animate={bodyMotionStates.animate}
        exit={bodyMotionStates.initial}
        layout="position"
      >
        <form className={styles.bar}>
          <input
            name="search"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={(e) => e.preventDefault()}
            autoFocus
          />
          <div className={styles.icon}>
            {isLoading ? (
              <span aria-saving="true" />
            ) : (
              <SearchIcon className="stroke" />
            )}
          </div>
        </form>
        {searchResults?.players?.length > 0 && (
          <motion.div
            className={styles.content}
            initial={bodyContentMotionStates.initial}
            animate={bodyContentMotionStates.animate}
            exit={bodyContentMotionStates.exit}
            custom={1}
            layout="position"
          >
            <h3 className={styles.header}>Players</h3>
            <div className={styles.list}>
              {searchResults.players.slice(0, 12).map((player) => (
                <Link
                  href={`/players/${player.id}`}
                  className={styles.item}
                  key={player.username}
                  onClick={() => setIsSeachBarOpen(false)}
                >
                  <div className={styles.propic}>
                    <Image
                      src={`https://${player.thumbnail}`}
                      alt={`${player.username}`}
                      fill
                    />
                  </div>
                  <div className={styles.name}>
                    {highlightMatch(player.username, searchValue)}
                  </div>
                  <div className={styles.secondaryInfo}>
                    {player.globalRank && (
                      <div className={styles.rank}>
                        #{Intl.NumberFormat('us-US').format(player.globalRank)}
                      </div>
                    )}
                    {player.rating && (
                      <div className={styles.rating}>
                        {player.rating.toFixed(0)} TR
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
        {searchResults?.tournaments?.length > 0 && (
          <motion.div
            className={styles.content}
            initial={bodyContentMotionStates.initial}
            animate={bodyContentMotionStates.animate}
            exit={bodyContentMotionStates.exit}
            custom={2}
            layout="position"
          >
            <h3 className={styles.header}>Tournaments</h3>
            <div className={styles.list}>
              {searchResults.tournaments.slice(0, 12).map((tournament) => (
                <Link
                  className={styles.item}
                  key={tournament.name}
                  href={`/tournaments/${tournament.id}`}
                  onClick={() => setIsSeachBarOpen(false)}
                >
                  <div className={styles.name}>
                    {highlightMatch(tournament.name, searchValue)}
                  </div>
                  <div className={styles.secondaryInfo}>
                    <div className={styles.mode}>
                      {mode[tournament.ruleset]}
                    </div>
                    <div className={styles.format}>
                      {tournament.lobbySize}v{tournament.lobbySize}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
        {searchResults?.matches?.length > 0 && (
          <motion.div
            className={styles.content}
            initial={bodyContentMotionStates.initial}
            animate={bodyContentMotionStates.animate}
            exit={bodyContentMotionStates.exit}
            custom={3}
            layout="position"
          >
            <h3 className={styles.header}>Matches</h3>
            <div className={styles.list}>
              {searchResults.matches.slice(0, 12).map((match) => (
                <div className={styles.item} key={match.name}>
                  <div className={styles.name}>
                    {highlightMatch(match.name, searchValue)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
