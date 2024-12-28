import LoginButton from '@/components/Button/LoginButton';
import Logo from '@/components/Homepage/Logo/Logo';
import decoration1 from '@/public/decorations/decoration-1.svg?url';
import decoration2 from '@/public/decorations/decoration-2.svg?url';
import decoration3 from '@/public/decorations/decoration-3.svg?url';
import decoration4 from '@/public/decorations/decoration-4.svg?url';
import fullLogoDark from '@/public/logos/full-logo-dark.svg?url';
import fullLogo from '@/public/logos/full-logo.svg?url';
import Image from 'next/image';
import Balancer from 'react-wrap-balancer';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.row}>
        <div className={styles.box}>
          <Balancer ratio={0.4}>
            A one-stop shop for osu! tournament performance statistics
          </Balancer>
          <LoginButton />
        </div>
        <div className={styles.box}>
          <Logo />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Tournament rating</h1>
          <p>
            Tournament Rating, or TR, is a value which ranks how well you perform relative to others. 
          </p>
        </div>
        <div className={styles.decoration}></div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Fair competition</h1>
          <p>
            Accurately filter players who excel in performance compared to their peers.
          </p>
        </div>
        <div className={styles.decoration}>
          <Image src={decoration1} alt="decoration-1" fill />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Verified Tournaments</h1>
          <p>
            Only human-verified tournament data is included in our rating algorithm.
          </p>
        </div>
        <div className={styles.decoration}>
          <Image src={decoration2} alt="decoration-2" fill />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Transparency</h1>
          <p>
            o!TR is built from the ground up to be fully public and verifiable by third parties.
          </p>
        </div>
        <div className={styles.decoration}>
          <Image src={decoration3} alt="decoration-3" fill />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>All game modes supported</h1>
          <p>osu! doesn&apos;t just mean standard!</p>
        </div>
        <div className={styles.decoration}></div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>By the community, for the community</h1>
          <p>
            The o!TR team is comprised of seasoned tournament players, staff, and hosts.
          </p>
        </div>
        <div className={styles.decoration}>
          <Image src={decoration4} alt="decoration-4" fill />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Weekly updates</h1>
          <p>
            Each Wednesday at 00:00 UTC, we reprocesses tournament match data. Will there be a new #1?
          </p>
        </div>
        <div className={styles.decoration}></div>
      </div>
    </main>
  );
}
