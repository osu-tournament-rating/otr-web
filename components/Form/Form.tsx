import styles from './Form.module.css';

export default function Form({
  action,
  children,
}: {
  action: any;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className={styles.form} id={'tournament-form'}>
      {children}
    </form>
  );
}
