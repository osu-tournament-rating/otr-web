'use client';

import { fetchSearchData } from '@/app/actions';
import searchIcon from '@/public/icons/search.svg';
import { useClickAway } from '@uidotdev/usehooks';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import styles from './SearchBar.module.css';

const initialState = {
  search: undefined,
};

export default function SearchBar({ setIsSeachBarOpen }) {
  const [searchValue, setSearchValue] = useState('');
  const [state, formAction] = useFormState(fetchSearchData, initialState);
  const [isLoading, setIsLoading] = useState(false);

  console.log(state);

  const ref = useClickAway(() => {
    setIsSeachBarOpen(false);
  });

  useEffect(() => {
    if (searchValue.length < 3) return;

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
    <div className={styles.container}>
      <div className={styles.body} ref={ref}>
        <form action={fetchSearchData} className={styles.bar}>
          <input
            name={'search'}
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          {/* <div className={styles.icon}>
            <Image src={searchIcon} alt={'search icon'} fill />
          </div> */}
          <div className={styles.icon}>
            {isLoading ? (
              <span aria-saving="true" />
            ) : (
              <Image src={searchIcon} alt={'search icon'} fill />
            )}
          </div>
        </form>
        {state?.search?.players.length > 0 && (
          <div className={styles.content}>
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
                  <Link href={'/'} className={styles.item} key={player.text}>
                    <div className={styles.propic}>
                      <Image
                        src={`http://${player.thumbnail}`}
                        alt={`${player.text}`}
                        fill
                      />
                    </div>
                    <div className={styles.username}>
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
                      {player.text}
                    </div>
                    {/* <div className={styles.rank}>#24 024</div>
                    <div className={styles.rating}>1400 TR</div> */}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <div className={styles.content}>
          <h3 className={styles.header}>Tournaments</h3>
          <div className={styles.list}>
            <div className={styles.item}>Broccolo Cup</div>
            <div className={styles.item}>Broccolo RED</div>
            <div className={styles.item}>Broccolo Verde Cup</div>
          </div>
        </div>
      </div>
    </div>
  );
}
