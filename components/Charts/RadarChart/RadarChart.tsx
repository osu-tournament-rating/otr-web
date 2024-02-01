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

export default function RadarChart({
  winrateModData,
  averageModScore,
}: {
  winrateModData?: any;
  averageModScore?: any;
}) {
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

  if (winrateModData) {
    Object.keys(winrateModData).forEach((mod: any) => {
      let label = mod.replace('played', '');
      let value = (winrateModData[mod]?.winrate * 100) | 0;
      mods.push({ label, value });
    });
    mods.sort((a: any, b: any) => a.value < b.value);
  }

  if (averageModScore) {
    Object.keys(averageModScore).forEach((mod: any) => {
      let label = mod.replace('played', '');
      let value = averageModScore[mod]?.normalizedAverageScore.toFixed(0) | 0;
      mods.push({ label, value });
    });
    mods.sort((a: any, b: any) => a.value < b.value);
  }

  const data = {
    labels: mods.map((mod) => mod.label).slice(0, 5),
    datasets: [
      {
        label: winrateModData
          ? 'Winrate %'
          : averageModScore
          ? 'AVG Score'
          : 'Winrate %',
        data: mods.map((mod) => mod.value).slice(0, 5),
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
        },
        backgroundColor: 'rgb(250,250,250)',
        beginAtZero: false,
        angleLines: {
          borderDash: (context: any) => {
            const space = context.scale.yCenter - context.scale.top - 30;
            const ticksLength = context.scale.ticks.length - 1;
            const spaceInPx = space / ticksLength;
            return [0, 0, 0, spaceInPx, 2500];
          },
        },
        min: winrateModData ? -20 : averageModScore ? -300000 : -20,
        max: winrateModData ? 100 : averageModScore ? 1200000 : 100,
        ticks: {
          font: {
            size: 10,
            family: font,
            weight: 300,
          },
          stepSize: winrateModData ? 20 : averageModScore ? 300000 : 20,
          callback: (value: any, tick: any, values: any) => {
            return `${value.toLocaleString('en-US')}`;
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
