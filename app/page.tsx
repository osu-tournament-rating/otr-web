import LoginButton from '@/components/Button/LoginButton';
import decoration1 from '@/public/decorations/decoration-1.svg';
import decoration2 from '@/public/decorations/decoration-2.svg';
import decoration3 from '@/public/decorations/decoration-3.svg';
import decoration4 from '@/public/decorations/decoration-4.svg';
import fullLogo from '@/public/logos/full-logo.svg';
import Image from 'next/image';
import Balancer from 'react-wrap-balancer';
import styles from './page.module.css';

export default async function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.row}>
        <div className={styles.box}>
          <Balancer ratio={0.4}>
            Suite of tools designed to make osu! tournaments better for everyone
          </Balancer>
          <LoginButton />
        </div>
        <div className={styles.box}>
          <div className={styles.logo}>
            <Image src={fullLogo} alt={'o!TR logo'} fill />
          </div>
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Tournament Rating</h1>
          <p>
            A rating system that aims to predict your performance in tournaments
            relative to others
          </p>
        </div>
        <div className={styles.decoration}></div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Rank restricted tournaments</h1>
          <p>
            o!TR combined with BWS opens the door to an all-new level of fair
            competition in tournaments targeting specific skill brackets
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
            Our goal is to only include legitimate tournament matches in the
            rating algorithm
          </p>
        </div>
        <div className={styles.decoration}>
          <Image src={decoration2} alt="decoration-2" fill />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>Stat nerd&apos;s heaven</h1>
          <p>
            We have a huge assortment of tools for players and teams. Dive into
            all of your previous matches, compare your team to another team, see
            exactly how your performance has changed overtime, and so much more
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
          <h1>100% Open Source</h1>
          <p>
            We are committed to remaining open source and transparent with our
            algorithm
          </p>
        </div>
        <div className={styles.decoration}>
          <Image src={decoration4} alt="decoration-4" fill />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.info}>
          <h1>99.9999%</h1>
          <p>
            Our goal is to provide a service for all of osu!, so we want to
            remain as reliable as possible. Outside of planned maintenance, we
            aim to have a reliability of 99.9999%. That’s 31 seconds of
            unexpected downtime per year.
          </p>
        </div>
        <div className={styles.decoration}></div>
      </div>
    </main>
  );
}
