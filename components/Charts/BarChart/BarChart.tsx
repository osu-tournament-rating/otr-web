'use client';

import customChartBackground from '@/lib/chartjs-plugins/customChartBackground';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { useTheme } from 'next-themes';
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
  recentTournamentPerformances,
  teamSizes,
}: {
  mainAxe: any;
  bestTournamentPerformances?: any;
  recentTournamentPerformances?: any;
  teamSizes?: any;
}) {
  const [font, setFont] = useState('');
  const [colors, setColors] = useState('');
  const [textColor, setTextColor] = useState([]);
  const [canvasColor, setCanvasColor] = useState([undefined, undefined]);
  const [canvasInnerLinesColor, setCanvasInnerLinesColor] = useState([
    undefined,
    undefined,
  ]);

  const { theme } = useTheme();

  /* get variables of colors from CSS */
  useEffect(() => {
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
    setColors([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--accent-color'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--green-400'
      ),
    ]);
    setCanvasColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-dark'
      ),
    ]);
    setTextColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-text-color-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-text-color-dark'
      ),
    ]);
    setCanvasInnerLinesColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-inner-lines-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-inner-lines-dark'
      ),
    ]);
  }, []);

  var labels = ['HR', 'NM', 'HD', 'FM'];
  var dataScores: any[] = [];

  if (bestTournamentPerformances) {
    labels.length = 0;
    bestTournamentPerformances.map((tournament: any, index: any) => {
      labels[index] = tournament.tournamentName;
      dataScores[index] = tournament.matchCost.toFixed(2);
      return;
    });
  }

  if (recentTournamentPerformances) {
    labels.length = 0;
    recentTournamentPerformances.map((tournament: any, index: any) => {
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
      customCanvasBackgroundColor: {
        color: canvasColor[0]
          ? theme === 'light'
            ? `hsl(${canvasColor[0]})`
            : `hsl(${canvasColor[1]})`
          : undefined,
      },
    },
    scales: {
      x: {
        offset: true,
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: canvasInnerLinesColor[0]
            ? theme === 'light'
              ? `hsla(${canvasInnerLinesColor[0]})`
              : `hsla(${canvasInnerLinesColor[1]})`
            : 'transparent',
          display: mainAxe === 'y' ? true : false,
        },
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          color:
            theme === 'light'
              ? `hsla(${textColor[0]})`
              : `hsla(${textColor[1]})`,
          precision: 1,
          stepSize: 0.2,
          includeBounds: false,
          autoSkip: false,
        },
        min:
          bestTournamentPerformances || recentTournamentPerformances
            ? 0.4
            : null,
        max:
          bestTournamentPerformances || recentTournamentPerformances
            ? /* ? Math.max(...dataScores)
            : */ Math.max(...dataScores) % 0.2 === 1
              ? Math.max(...dataScores)
              : Math.max(...dataScores) + 0.1
            : null,
        suggestedMax: 2.2,
      },
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          display: mainAxe === 'x' ? true : false,
          color: canvasInnerLinesColor[0]
            ? theme === 'light'
              ? `hsla(${canvasInnerLinesColor[0]})`
              : `hsla(${canvasInnerLinesColor[1]})`
            : 'transparent',
        },
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          color:
            theme === 'light'
              ? `hsla(${textColor[0]})`
              : `hsla(${textColor[1]})`,
          precision: 0,
          stepSize: 1,
        },
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: teamSizes ? 'Times' : 'Average match cost',
        data: dataScores,
        backgroundColor: teamSizes
          ? `hsla(${colors[0]})`
          : `hsla(${colors[1]})`,
        beginAtZero: true,
        padding: 10,
      },
    ],
  };

  return (
    <Bar data={data} options={options} plugins={[customChartBackground]} />
  );
}
