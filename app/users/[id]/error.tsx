'use client';

import backgroundError from '@/public/images/error-background.svg';
import Image from 'next/image';
import { useEffect } from 'react';
import Balancer from 'react-wrap-balancer';
import styles from './error.module.css';

const errors = {
  '404': {
    title: '404',
    message: "We don't have that page",
    reloadBtn: false,
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  let errorContent = !isNaN(error.message)
    ? errors[error.message]
    : errors['404'];

  return (
    <div className={styles.errorDiv}>
      <Image src={backgroundError} alt="Error background" fill />
      <div className={styles.content}>
        <h1>{errorContent.title}</h1>
        <span>{errorContent.message}</span>
        {errorContent.reloadBtn && (
          <button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
