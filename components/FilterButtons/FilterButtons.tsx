'use client';

import { useState } from 'react';
import FilterChangeButton from '../Button/FilterChangeButton/FilterChangeButton';
import OpenFiltersButton from '../Button/OpenFiltersButton/OpenFiltersButton';
import FiltersCollapsible from '../Collapsible/FiltersCollapsible/FiltersCollapsible';
import styles from './FilterButtons.module.css';

export default function FilterButtons({
  params,
  data,
}: {
  params: {};
  data: {};
}) {
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <FilterChangeButton
          text={'global'}
          isSelected={
            (params.type == null || params.type === 'global') && 'global'
          }
        />
        {data.playerChart && (
          <FilterChangeButton
            text={'country'}
            isSelected={params.type === 'country'}
          />
        )}
        <OpenFiltersButton
          isCollapsibleOpen={isCollapsibleOpen}
          setIsCollapsibleOpen={setIsCollapsibleOpen}
        />
      </div>
      <FiltersCollapsible
        params={params}
        isCollapsibleOpen={isCollapsibleOpen}
        data={data.filterDefaults}
      />
    </div>
  );
}
