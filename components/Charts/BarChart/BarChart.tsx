'use client';

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import styles from './BarChart.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function BarChart({ mainAxe = 'x' }: { mainAxe: any }) {
  const [font, setFont] = useState('');

  /* get variables of colors from CSS */
  useEffect(() => {
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
  }, []);

  const options = {
    indexAxis: mainAxe,
    elements: {
      bar: {
        borderWidth: 0,
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
        enabled: false,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
        },
        /* border: {
              color: 'transparent',
            }, */
      },
      y: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
        },
      },
    },
  };

  const labels = ['HR', 'NM', 'HD', 'FM'];

  const data = {
    labels,
    datasets: [
      {
        label: 'Dataset 1',
        data: labels.map(() => Math.ceil(Math.random() * 100)),
        backgroundColor: [
          'rgba(255, 99, 132)',
          'rgba(54, 162, 235)',
          'rgba(255, 206, 86)',
          'rgba(25, 156, 86)',
        ],
        /* barThickness: 30, */
        /* maxBarThickness: 30, */
        beginAtZero: true,
      },
    ],
  };

  return <Bar data={data} options={options} />;
}
