'use client';

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import styles from './DoughnutChart.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutChart({ scoreStats }: { scoreStats?: {} }) {
  const [modsColors, setModsColors] = useState({});

  let labels = ['NM', 'HD', 'HR'];

  let values = [12, 19, 3];

  if (scoreStats) {
    labels = [];
    values = [];
    Object.keys(scoreStats).forEach((key) => {
      if (key.startsWith('countPlayed')) {
        if (scoreStats[key] === 0) return;
        let labelName = key.replace('countPlayed', '');
        labels.push(labelName);
        values.push(scoreStats[key]);
      }
    });
  }

  let valuesSum = values.reduce((a, b) => a + b, 0);
  let valuesPercentage = values.map((number) =>
    ((number / valuesSum) * 100).toPrecision(2)
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
        spacing: 4,
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
