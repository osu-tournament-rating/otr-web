'use client';

import FilterChangeButton from '../FilterChangeButton/FilterChangeButton';
import styles from './FilterButtons.module.css';

export default function FilterButtons({ params }: { params: {} }) {
  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <FilterChangeButton
          text={'90 days'}
          value={'90'}
          isSelected={params.time === '90'}
        />
        <FilterChangeButton
          text={'6 months'}
          value={'180'}
          isSelected={params.time === '180'}
        />
        <FilterChangeButton
          text={'1 year'}
          value={'365'}
          isSelected={params.time === '365'}
        />
        <FilterChangeButton
          text={'2 years'}
          value={'730'}
          isSelected={params.time === '730'}
        />
        <FilterChangeButton
          text={'All time'}
          value={''}
          isSelected={params.time == null || params.time === ''}
        />
      </div>
    </div>
  );
}
