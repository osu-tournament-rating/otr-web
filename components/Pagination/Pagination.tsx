'use client';
import { paginationParamsToURL } from '@/app/actions';
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import styles from './Pagination.module.css';
import { usePagination } from './usePagination';

export default function Pagination({
  /* onPageChange, */
  totalCount,
  siblingCount = 1,
  /* currentPage, */
  pageSize,
  params,
}) {
  const router = useRouter();

  const currentLeaderboardType = params.type ?? null;
  const currentPage: number = params.page != null ? +params.page : 1;

  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize,
  });

  // If there are less than 2 times in pagination range we shall not render the component
  if (currentPage === 0 || paginationRange?.length < 2) {
    return null;
  }

  let lastPage = paginationRange[paginationRange?.length - 1];

  const onPageChange = async (number: number) => {
    let url = await paginationParamsToURL(params);

    router.push(`/leaderboards?${url}&page=${number}#leaderboard`, {
      scroll: true,
    });

    /* router.push(
      `/leaderboards?${
        currentLeaderboardType !== null
          ? `type=${currentLeaderboardType}&` 
          : ''
      }page=${number}`
    ); */
  };

  const onNext = async () => {
    if (currentPage < parseInt(lastPage)) {
      let url = await paginationParamsToURL(params);
      router.push(`/leaderboards?${url}&page=${currentPage + 1}#leaderboard`, {
        scroll: true,
      });
    }
  };

  const onPrevious = async () => {
    if (currentPage > 1) {
      let url = await paginationParamsToURL(params);
      router.push(`/leaderboards?${url}&page=${currentPage - 1}#leaderboard`, {
        scroll: true,
      });
    }
  };

  return (
    <ul className={styles.paginationContainer}>
      <li
        className={clsx(styles.item, currentPage === 1 ? styles.disabled : '')}
        onClick={onPrevious}
      >
        <FontAwesomeIcon icon={faAngleLeft} />
        Previous
      </li>
      {paginationRange?.map((pageNumber, index) => {
        // If the pageItem is a DOT, render the DOTS unicode character
        if (pageNumber === 'DOTS') {
          return (
            <li key={index} className={clsx(styles.item, styles.dots)}>
              &#8230;
            </li>
          );
        }

        // Render our Page Pills
        return (
          <li
            key={index}
            className={clsx(
              styles.item,
              pageNumber == currentPage ? styles.selected : ''
            )}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </li>
        );
      })}
      <li
        className={clsx(
          styles.item,
          currentPage === lastPage ? styles.disabled : ''
        )}
        onClick={onNext}
      >
        Next
        <FontAwesomeIcon icon={faAngleRight} />
      </li>
    </ul>
  );
}
