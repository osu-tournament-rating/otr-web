'use client';

import { fetchSearchData } from '@/app/actions';
import searchIcon from '@/public/icons/search.svg';
import { useClickAway } from '@uidotdev/usehooks';
import { AnimatePresence, motion, stagger } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
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

const mode: { [key: number]: { image: any; alt: string } } = {
  0: 'std',
  1: 'taiko',
  2: 'ctb',
  3: 'mania',
};

const disableEnter = (e) => {
  if (e.keyCode === 13) return e.preventDefault();
};

export default function SearchBar({ setIsSeachBarOpen }) {
  const [searchValue, setSearchValue] = useState('');
  const [state, formAction] = useFormState(fetchSearchData, initialState);
  const [isLoading, setIsLoading] = useState(false);

  const ref = useClickAway(() => {
    setIsSeachBarOpen(false);
  });

  useEffect(() => {
    if (searchValue.length < 3) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let timeout = setTimeout(() => {
      let formData = new FormData();
      formData.append('search', searchValue);
      formAction(formData);
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchValue]);

  useEffect(() => {
    if (state.status !== 'success') return;

    setIsLoading(false);
  }, [state]);

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
        <form
          action={fetchSearchData}
          className={styles.bar}
          onKeyDown={disableEnter}
        >
          <input
            name={'search'}
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={(e) => e.preventDefault(true)}
            autoFocus={true}
          />
          <div className={styles.icon}>
            {isLoading ? (
              <span aria-saving="true" />
            ) : (
              <Image src={searchIcon} alt={'search icon'} fill />
            )}
          </div>
        </form>
        {state?.search?.players.length > 0 && (
          <motion.div
            className={styles.content}
            initial={bodyContentMotionStates.initial}
            animate={bodyContentMotionStates.animate}
            exit={bodyContentMotionStates.exit}
            custom={1}
            layout={'position'}
          >
            <h3 className={styles.header}>Players</h3>
            <div className={styles.list}>
              {state?.search?.players.slice(0, 12).map((player) => {
                /* const selectedText = searchValue;
    
                    let indexesUsername = [
                      player.text.indexOf(searchValue),
                      player.text.lastIndexOf(searchValue),
                    ];
    
                    const regEscape = (v) =>
                      v.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    
                    let username = player.text.split(
                      new RegExp(regEscape(searchValue), 'ig')
                    ); */

                return (
                  <Link
                    href={`/players/${player.id}`}
                    className={styles.item}
                    key={player.username}
                    onClick={() => setIsSeachBarOpen(false)}
                  >
                    <div className={styles.propic}>
                      <Image
                        src={`http://${player.thumbnail}`}
                        alt={`${player.username}`}
                        fill
                      />
                    </div>
                    <div className={styles.name}>
                      {/* {username.length > 1 && (
                            <>
                              <div>{username[0]}</div>
                              <span>{selectedText}</span>
                              <div>{username[1]}</div>
                            </>
                          )}
                          {username.length < 2 && indexesUsername[0] === 0 && (
                            <>
                              <span>
                                {/[A-Z]/.test(player.text[0])
                                  ? selectedText.text.charAt(0).toUpperCase() +
                                    selectedText.text.slice(1)
                                  : selectedText}
                              </span>
                              <div>{username[0]}</div>
                            </>
                          )}
                          {username.length < 2 && indexesUsername[0] !== 0 && (
                            <>
                              <div>{username[0]}</div>
                              <span>{selectedText}</span>
                            </>
                          )} */}
                      {player.username}
                    </div>
                    <div className={styles.secondaryInfo}>
                      {player.globalRank && (
                        <div className={styles.rank}>
                          #
                          {Intl.NumberFormat('us-US').format(player.globalRank)}
                        </div>
                      )}
                      {player.rating && (
                        <div className={styles.rating}>
                          {player.rating.toFixed(0)} TR
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
        {state?.search?.tournaments.length > 0 && (
          <motion.div
            className={styles.content}
            initial={bodyContentMotionStates.initial}
            animate={bodyContentMotionStates.animate}
            exit={bodyContentMotionStates.exit}
            custom={2}
            layout={'position'}
          >
            <h3 className={styles.header}>Tournaments</h3>
            <div className={styles.list}>
              {state?.search?.tournaments.slice(0, 12).map((tournament) => {
                return (
                  <div className={styles.item} key={tournament.name}>
                    <div className={styles.name}>{tournament.name}</div>
                    <div className={styles.secondaryInfo}>
                      {/* <div className={styles.year}>{}</div> */}
                      <div className={styles.format}>
                        {tournament.teamSize}v{tournament.teamSize}
                      </div>
                      <div className={styles.mode}>
                        {mode[tournament.ruleset]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        {state?.search?.matches.length > 0 && (
          <motion.div
            className={styles.content}
            initial={bodyContentMotionStates.initial}
            animate={bodyContentMotionStates.animate}
            exit={bodyContentMotionStates.exit}
            custom={3}
            layout={'position'}
          >
            <h3 className={styles.header}>Matches</h3>
            <div className={styles.list}>
              {state?.search?.matches.slice(0, 12).map((match) => {
                return (
                  <div className={styles.item} key={match.name}>
                    <div className={styles.name}>{match.name}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
