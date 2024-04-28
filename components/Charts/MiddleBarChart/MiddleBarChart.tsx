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
import { array } from 'zod';
import styles from './MiddleBarChart.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const findMinMaxNumber = (array) => {
  let number = 0;

  array.forEach((element) => {
    let currNumber = Math.abs(Number(element));

    if (number < currNumber) number = currNumber;
  });

  return number;
};

export default function MiddleBarChart() {
  const [font, setFont] = useState('');
  const [color, setColor] = useState('');

  /* get variables of colors from CSS */
  useEffect(() => {
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
    setColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--green-400'
      ),
      getComputedStyle(document.documentElement).getPropertyValue('--red-400'),
    ]);
  }, []);

  const graphColors = (array) => {
    let colors = array.map((number) =>
      Number(number) < 0 ? `hsla(${color[1]})` : `hsla(${color[0]})`
    );

    return colors;
  };

  var labels = ['Akinari', 'worst hr player', 'Koba', 'Arge'];
  var dataScores: any[] = [-70, 20, 50, 66];

  let minMax = findMinMaxNumber(dataScores);

  const options = {
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
        enabled: true,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          precision: 1,
          stepSize: 0.2,
        },
      },
      y: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          precision: 0,
          stepSize: 5,
        },
        min: -minMax,
        max: minMax,
        suggestedMax: minMax,
        suggestedMin: -minMax,
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'W/L',
        data: dataScores,
        backgroundColor: graphColors(dataScores),
        beginAtZero: true,
        padding: 10,
      },
    ],
  };

  return (
    <div className={styles.middleBarChart}>
      <Bar data={data} options={options} />
    </div>
  );
}
