'use client';

import styles from './InputError.module.css';

export default function FormInputError({ message }: { message: string | string[] | undefined }) {
  if (!message) {
    return;
  }
  
  return (
    <span className={styles.inputError}>
      {Array.isArray(message) ? message.map(m => (<p>{m}</p>)) : (<p>{message}</p>)}
    </span>
  )
}