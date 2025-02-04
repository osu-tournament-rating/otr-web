'use client';

import customChartBackground from '@/lib/chartjs-plugins/customChartBackground';
import customChartScaleXBackground from '@/lib/chartjs-plugins/customChartScaleXBackground';
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
import { useEffect, useRef, useState } from 'react';
import { Bar, getDatasetAtEvent, getElementsAtEvent } from 'react-chartjs-2';
import styles from './PlayersBarChart.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function PlayersBarChart({ players }: { players: [] }) {
  const [font, setFont] = useState(undefined);
  const [textColor, setTextColor] = useState([]);
  const [barColor, setBarColor] = useState(undefined);
  const [canvasColor, setCanvasColor] = useState([undefined, undefined]);
  const [canvasInnerLinesColor, setCanvasInnerLinesColor] = useState([
    undefined,
    undefined,
  ]);
  const [canvasScalesColor, setCanvasScalesColor] = useState([
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
    setTextColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-text-color-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-text-color-dark'
      ),
    ]);
    setBarColor(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-players-bar-color'
      )
    );
    setCanvasColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-dark'
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
    setCanvasScalesColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-scales-background-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-scales-background-dark'
      ),
    ]);
  }, []);

  const options = {
    indexAxis: 'y' as const,
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
          : 'transparent',
      },
      customCanvasScaleXBackgroundColor: {
        color: canvasScalesColor[0]
          ? theme === 'light'
            ? `hsl(${canvasScalesColor[0]})`
            : `hsl(${canvasScalesColor[1]})`
          : 'transparent',
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          color:
            theme === 'light'
              ? `hsla(${textColor[0]})`
              : `hsla(${textColor[1]})`,
          textStrokeColor:
            theme === 'light'
              ? `hsla(${textColor[0]})`
              : `hsla(${textColor[1]})`,
          textStrokeWidth: 0.4,
          precision: 0,
          z: 2,
        },
        grid: {
          color: canvasInnerLinesColor
            ? theme === 'light'
              ? `hsla(${canvasInnerLinesColor[0]})`
              : `hsla(${canvasInnerLinesColor[1]})`
            : 'transparent',
        },
        border: {
          display: false,
        },
        grace: '20%',
      },
      y: {
        ticks: {
          font: {
            size: 0,
            family: font,
          },
          z: 2,
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
    layout: {
      padding: {
        left: 25,
      },
    },
  };

  let labels: string[] = [];
  let propicIDs: number[] = [];
  let frequency: number[] = [];

  if (players) {
    players.forEach((player) => {
      labels.push(player.username);
      propicIDs.push(player.osuId);
      frequency.push(player.frequency);
    });
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Times',
        data: frequency,
        propicIDs: propicIDs,
        backgroundColor: [`hsl(${barColor})`],
        barThickness: 30,
        maxBarThickness: 30,
        beginAtZero: true,
      },
    ],
  };

  const playerImage = {
    id: 'playerImage',
    beforeDatasetsDraw(chart, args, plugin) {
      const { ctx, data } = chart;

      data.datasets[0].propicIDs.forEach((image, index) => {
        const chartImage = new (Image as any)();
        chartImage.src = `https://s.ppy.sh/a/${image}`;
        chartImage.classList.add(styles.graphPropic);

        const yPos = chart.getDatasetMeta(0).data[index].y;
        // Save the current context state
        ctx.save();

        // Create a circular clipping path
        ctx.beginPath();
        ctx.arc(15, yPos, 15, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        // Draw the image
        ctx.drawImage(chartImage, 0, yPos - 15, 30, 30);

        // Restore the context state
        ctx.restore();
      });
    },
  };

  const chartOnClick = (event: any) => {
    if (getElementsAtEvent(chartRef.current, event).length > 0) {
      const datasetIndex = getElementsAtEvent(chartRef.current, event)[0]
        .datasetIndex;
      const dataPoint = getElementsAtEvent(chartRef.current, event)[0].index;

      window.open(
        `https://osu.ppy.sh/users/${data.datasets[datasetIndex].propicIDs[dataPoint]}`
      );
    }
  };

  const chartRef: { current: any } = useRef(undefined);

  return (
    <div className={styles.playersChart}>
      <Bar
        options={options}
        data={data}
        plugins={[
          playerImage,
          customChartBackground,
          customChartScaleXBackground,
        ]}
        onClick={chartOnClick}
        ref={chartRef}
      />
    </div>
  );
}
