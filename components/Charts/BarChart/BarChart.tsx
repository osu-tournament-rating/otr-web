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

export default function BarChart({
  mainAxe = 'x',
  bestTournamentPerformances,
  worstTournamentPerformances,
  teamSizes,
}: {
  mainAxe: any;
  bestTournamentPerformances?: any;
  worstTournamentPerformances?: any;
  teamSizes?: any;
}) {
  const [font, setFont] = useState('');
  const [color, setColor] = useState('');

  /* get variables of colors from CSS */
  useEffect(() => {
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
    setColor(
      getComputedStyle(document.documentElement).getPropertyValue('--green-400')
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
          precision: 0.4,
        },
        grace: '2%',
        /* border: {
              color: 'transparent',
            }, */
        /* steps: 2,
        stepsSize:
          bestTournamentPerformances || worstTournamentPerformances ? 1 : 1, */
        min:
          bestTournamentPerformances || worstTournamentPerformances
            ? 0.5
            : null,
        suggestedMax:
          bestTournamentPerformances || worstTournamentPerformances
            ? 1.8
            : null,
      },
      y: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          precision: 0,
        },
        grace: '10%',
        stepsSize: 1,
      },
    },
  };

  var labels = ['HR', 'NM', 'HD', 'FM'];
  var dataScores = ['']; /* labels.map(() => Math.ceil(Math.random() * 20)) */

  if (bestTournamentPerformances) {
    labels.length = 0;
    bestTournamentPerformances.map((tournament: any, index: any) => {
      labels[index] = tournament.tournamentName;
      dataScores[index] = tournament.matchCost.toFixed(2);
      return;
    });
  }

  if (worstTournamentPerformances) {
    labels.length = 0;
    worstTournamentPerformances.map((tournament: any, index: any) => {
      labels[index] = tournament.tournamentName;
      dataScores[index] = tournament.matchCost.toFixed(2);
      return;
    });
  }

  if (teamSizes) {
    Object.keys(teamSizes).map((data: any, index: any) => {
      labels[index] = data.replace('count', '');
      return;
    });

    Object.values(teamSizes).map((data: any, index: any) => {
      dataScores[index] = data;
      return;
    });
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Dataset 1',
        data: dataScores,
        backgroundColor: teamSizes
          ? [
              'rgba(120, 227, 117, 1)',
              'rgba(76, 148, 255, 1)',
              'rgba(227, 117, 117, 1)',
            ]
          : `hsla(${color})`,
        /* barThickness: 30, */
        /* maxBarThickness: 30, */
        beginAtZero: true,
        padding: 10,
      },
    ],
  };

  return <Bar data={data} options={options} />;
}
