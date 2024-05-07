'use client';

import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import styles from './RadarChart.module.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

function kFormatter(num: number) {
  return Math.abs(num) > 999999
    ? Math.sign(num) * (Math.abs(num) / 1000000).toFixed(1) + 'M'
    : Math.abs(num) > 999
    ? Math.sign(num) * (Math.abs(num) / 1000).toFixed(1) + 'k'
    : Math.sign(num) * Math.abs(num);
}

export default function RadarChart({
  winrateModData,
  averageModScore,
}: {
  winrateModData?: any;
  averageModScore?: any;
}) {
  const { theme } = useTheme();

  const [colors, setColors] = useState<string[]>([]);
  const [font, setFont] = useState('');

  /* get variables of colors from CSS */
  useEffect(() => {
    setColors([
      getComputedStyle(document.documentElement).getPropertyValue('--blue-600'),
      getComputedStyle(document.documentElement).getPropertyValue('--blue-400'),
    ]);
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
  }, []);

  let mods: object[] = [];
  let defaultLabels: string[] = [
    'NM',
    'HD',
    'HR',
    'DT',
    'EZ',
    'FL',
    'HT',
    'HDHR',
    'HDDT',
  ];

  if (winrateModData) {
    Object.keys(winrateModData).forEach((mod: any) => {
      let label = mod.replace('played', '');
      let value = (winrateModData[mod]?.winRate * 100) | 0;
      mods.push({ label, value });
    });
    mods.sort(
      (a: any, b: any) =>
        a.label === 'NM'
          ? a > b
          : a.value === b.value
          ? a.label > b.label
          : null /* a.value < b.value */
    );

    mods = mods.filter((mod) => mod.value !== 0);
  }

  if (averageModScore) {
    Object.keys(averageModScore).forEach((mod: any) => {
      let label = mod.replace('played', '');
      let value = averageModScore[mod]?.normalizedAverageScore.toFixed(0) | 0;
      mods.push({ label, value });
    });
    mods.sort(
      (a: any, b: any) =>
        a.label === 'NM'
          ? a > b
          : a.value === b.value
          ? a.label > b.label
          : null /* a.value < b.value */
    );

    mods = mods.filter((mod) => mod.value !== 0);
  }

  let existingMods = mods
    .filter((mod) => mod.value !== 0)
    .map((mod) => mod.label);
  defaultLabels = defaultLabels.filter((mod) => !existingMods.includes(mod));
  for (let i = 0; mods.length < 5; i++) {
    if (defaultLabels[i] === 'NM') {
      mods.unshift({ label: defaultLabels[i], value: 0 });
    } else {
      mods.push({ label: defaultLabels[i], value: 0 });
    }
  }

  const data = {
    labels: mods.map((mod) => mod.label),
    datasets: [
      {
        label: winrateModData
          ? 'Winrate %'
          : averageModScore
          ? 'AVG Score'
          : 'Winrate %',
        data: mods.map((mod) => mod.value),
        backgroundColor: `hsla(${colors[0]}, 0.15)`,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    elements: {
      line: {
        borderWidth: 0,
      },
      point: {
        pointBackgroundColor: `hsla(${colors[1]})`,
        pointBorderWidth: 0,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        position: 'right' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
        font: {
          family: font,
        },
      },
    },

    layout: {
      padding: {
        left: 0,
      },
    },
    scales: {
      r: {
        pointLabels: {
          font: {
            family: font,
            weight: 600,
          },
          color: theme === 'dark' ? 'rgba(250,250,250,0.8)' : '#656565',
        },
        grid: {
          color:
            theme === 'dark' ? 'rgba(250,250,250,0.028)' : 'rgba(0,0,0,0.08)',
        },
        backgroundColor:
          theme === 'light' ? 'rgb(250,250,250)' : 'rgba(0,0,0,0.05)',
        beginAtZero: false,
        angleLines: {
          borderDash: (context: any) => {
            const space = context.scale.yCenter - context.scale.top - 30;
            const ticksLength = context.scale.ticks.length - 1;
            const spaceInPx = space / ticksLength;
            return [0, 0, 0, spaceInPx, 2500];
          },
          color:
            theme === 'dark' ? 'rgba(250,250,250,0.028)' : 'rgba(0,0,0,0.08)',
        },
        min: winrateModData ? -25 : averageModScore ? -200000 : -25,
        max: winrateModData ? 100 : averageModScore ? 1000000 : 100,
        ticks: {
          font: {
            size: 10,
            family: font,
            weight: 300,
          },
          color: theme === 'dark' ? 'rgba(250,250,250,0.7)' : '#707070',
          stepSize: winrateModData ? 25 : averageModScore ? 200000 : 25,
          callback: (value: any, tick: any, values: any) => {
            return value !== 0
              ? `${kFormatter(value)}${winrateModData ? '%' : ''}`
              : '';
          },
          showLabelBackdrop: (context: any) => {
            return false;
          },
        },
      },
    },
  };

  return (
    <div className={styles.radarChart}>
      <Radar data={data} options={options} />
    </div>
  );
}
