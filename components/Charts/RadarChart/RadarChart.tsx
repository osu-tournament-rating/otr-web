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

  let labels = ['NM', 'HD', 'HR', 'DT', 'EZ'];
  let values = [95, 90, 22, 10, 50];

  if (winrateModData) {
    labels = ['NM', 'HD', 'HR', 'DT', 'EZ'];
    values = [
      (winrateModData.playedNM?.winrate * 100) | 0,
      (winrateModData.playedHD?.winrate * 100) | 0,
      (winrateModData.playedHR?.winrate * 100) | 0,
      (winrateModData.playedDT?.winrate * 100) | 0,
      (winrateModData.playedEZ?.winrate * 100) | 0,
    ];
  }

  if (averageModScore) {
    labels = ['NM', 'HD', 'HR', 'DT', 'EZ'];
    values = [
      averageModScore.playedNM?.normalizedAverageScore.toFixed(0) | 0,
      averageModScore.playedHD?.normalizedAverageScore.toFixed(0) | 0,
      averageModScore.playedHR?.normalizedAverageScore.toFixed(0) | 0,
      averageModScore.playedDT?.normalizedAverageScore.toFixed(0) | 0,
      averageModScore.playedEZ?.normalizedAverageScore.toFixed(0) | 0,
    ];
  }

  const data = {
    labels: labels,
    datasets: [
      {
        label: winrateModData
          ? 'Winrate %'
          : averageModScore
          ? 'AVG Score'
          : 'Winrate %',
        data: values,
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
      },
    },

    layout: {
      padding: {
        left: 0,
      },
    },
    scales: {
      r: {
        backgroundColor: 'rgb(250,250,250)',
        beginAtZero: true,
        angleLines: {
          borderDash: (context: any) => {
            const space = context.scale.yCenter - context.scale.top - 30;
            const ticksLength = context.scale.ticks.length - 1;
            const spaceInPx = space / ticksLength;
            return [0, 0, 0, spaceInPx, 2500];
          },
        },
        min: 0,
        max: winrateModData ? 100 : averageModScore ? 1200000 : 100,
        ticks: {
          stepSize: winrateModData ? 25 : averageModScore ? 300000 : 25,
          callback: (value: any, tick: any, values: any) => {
            return '';
          },
          showLabelBackdrop: (context: any) => {
            return false;
          },
          /* maxTicksLimit: 4, */
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
