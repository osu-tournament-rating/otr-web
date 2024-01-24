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
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          precision: 0,
        },
      },
      y: {
        ticks: {
          font: {
            size: 0,
            family: font,
          },
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
        backgroundColor: [
          'rgba(255, 99, 132)',
          'rgba(54, 162, 235)',
          'rgba(255, 206, 86)',
          'rgba(25, 156, 86)',
        ],
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
        chartImage.src = `http://s.ppy.sh/a/${image}`;
        chartImage.classList.add(styles.graphPropic);

        const yPos = chart.getDatasetMeta(0).data[index].y;
        ctx.drawImage(chartImage, 0, yPos - 15, 30, 30);
        /* console.log(yPos - 30, yPos); */
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

  const chartRef: { current: any } = useRef();

  return (
    <div className={styles.playersChart}>
      {/* <div className={styles.yAxe}>
        {labels.map((label, index) => {
          return (
            <div className={styles.label} key={index}>
              {
                <div className={styles.image}>
                  <Image src={'http://s.ppy.sh/a/4001304'} alt="propic" fill />
                </div>
              }
            </div>
          );
        })}
      </div> */}
      <div className={styles.chart}>
        <Bar
          options={options}
          data={data}
          plugins={[playerImage]}
          onClick={chartOnClick}
          ref={chartRef}
        />
      </div>
    </div>
  );
}
