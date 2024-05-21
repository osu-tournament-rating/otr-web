'use client';

import FilterChangeButton from '../FilterChangeButton/FilterChangeButton';
import styles from './FilterButtons.module.css';

export default function FilterButtons({ params }: { params: {} }) {
  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <FilterChangeButton
          text={'90 days'}
          isSelected={params.time === '90days'}
        />
        <FilterChangeButton
          text={'180 days'}
          isSelected={params.time === '180days'}
        />
        <FilterChangeButton
          text={'1 year'}
          isSelected={params.time === '1year'}
        />
        <FilterChangeButton
          text={'2 years'}
          isSelected={params.time === '2years'}
        />
        <FilterChangeButton
          text={'All time'}
          isSelected={params.time == null || params.time === 'infinite'}
        />
      </div>
    </div>
  );
}
