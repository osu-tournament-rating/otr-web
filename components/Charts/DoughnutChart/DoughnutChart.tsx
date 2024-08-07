'use client';

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import styles from './DoughnutChart.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutChart({ modStats }: { modStats?: {} }) {
  const [modsColors, setModsColors] = useState({});

  let labels = ['NM', 'HD', 'HR'];

  let values = [12, 19, 3];

  let otherValues = [];

  if (modStats) {
    labels = [];
    values = [];

    let sortable = [];

    for (let mods in modStats) {
      sortable.push([mods, modStats[mods]]);
    }

    sortable.sort((a, b) => {
      // nulls sort after anything else
      if (a[1] === null) {
        return 1;
      }
      if (b[1] === null) {
        return -1;
      }

      if (a[1].gamesPlayed === b[1].gamesPlayed) {
        return 0;
      }

      return a[1].gamesPlayed < b[1].gamesPlayed ? 1 : -1;
    });

    sortable = Object.fromEntries(sortable);

    Object.keys(sortable).forEach((key) => {
      if (key.startsWith('played')) {
        if (modStats[key] === null) return;
        let labelName = key.replace('played', '');
        labels.push(labelName);
        values.push(modStats[key]?.gamesPlayed);
      }
    });

    if (labels.length === values.length && labels.length > 5) {
      let lastValue = 0;

      for (let i = 5; i < values.length; i++) {
        otherValues.push({ label: labels[i], value: values[i] });
        lastValue += values[i];
      }
      labels.length = 4;
      values.length = 4;
      labels.push('Others');
      values.push(lastValue);
    }
  }

  let valuesSum = values.reduce((a, b) => a + b, 0);
  let valuesPercentage = values.map(
    (number) =>
      `${(number / valuesSum) * 100 < 1 ? '<' : ''}${(
        (number / valuesSum) *
        100
      ).toFixed(0)}`
  );

  useEffect(() => {
    setModsColors({
      NM: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-NM-bg'
      ),
      HD: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-HD-bg'
      ),
      HR: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-HR-bg'
      ),
      HDHR: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-HDHR-bg'
      ),
      DT: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-DT-bg'
      ),
      HDDT: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-HDDT-bg'
      ),
      EZ: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-EZ-bg'
      ),
      FL: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-FL-bg'
      ),
      HT: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-HT-bg'
      ),
      Others: getComputedStyle(document.documentElement).getPropertyValue(
        '--mods-Others-bg'
      ),
    });
  }, []);

  const data = {
    labels: labels,
    datasets: [
      {
        /* label: '# of Votes', */
        data: values,
        backgroundColor: labels.map((mod) => `hsla(${modsColors[mod]})`),
        borderWidth: 0,
        spacing: 5 /* 4 */,
        rotation: -20,
      },
    ],
  };

  const options = {
    responsive: true,
    width: '100%',
    plugins: {
      legend: {
        display: false,
        position: 'right' as const,
        textAlign: 'right' as const,
      },
      tooltip: {
        enabled: false,
      },
    },
    cutout: '70%',
  };

  return (
    <div className={styles.container}>
      <Doughnut options={options} data={data} />
      <div className={styles.legend}>
        {labels.map((label, index) => {
          return (
            <div className={styles.item} key={index}>
              <div className={styles.value}>{valuesPercentage[index]}</div>
              <span style={{ color: `hsla(var(--mods-${label}-bg))` }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
