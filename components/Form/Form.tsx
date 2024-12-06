import { DetailedHTMLProps, FormHTMLAttributes } from 'react';
import styles from './Form.module.css';

export default function Form({
  children,
  ...rest
}: Omit<DetailedHTMLProps<FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, 'className'> & { children: React.ReactNode }
) {
  return (
    <form className={styles.form} {...rest}>
      {children}
    </form>
  );
}
