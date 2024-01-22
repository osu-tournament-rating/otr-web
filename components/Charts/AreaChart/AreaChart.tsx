'use client';

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import styles from './AreaChart.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div');

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = styles.tooltip;

    const div = document.createElement('div');
    div.className = 'tooltip';
    div.style.margin = '0px';

    tooltipEl.appendChild(div);
    chart.canvas.parentNode.appendChild(tooltipEl);
  }

  return tooltipEl;
};

export default function AreaChart({
  ratingStats,
  rankChart,
}: {
  ratingStats?: [];
  rankChart?: [];
}) {
  const [colors, setColors] = useState<string[]>([]);

  const [font, setFont] = useState('');

  /* get variables of colors from CSS */
  useEffect(() => {
    setColors([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--accent-color'
      ),
      getComputedStyle(document.documentElement).getPropertyValue('--blue-400'),
    ]);
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
  }, []);

  const dateFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

  let labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
  let dataForGraph: number[] = labels.map(() => Math.ceil(Math.random() * 100));
  let tournamentsTooltip: object[];

  if (ratingStats) {
    labels = ratingStats.map((match) =>
      new Date(match.tooltipInfo.matchDate).toLocaleDateString(
        'en-US',
        dateFormatOptions
      )
    );
    /* labels = Array.from(new Set(labels)); */

    tournamentsTooltip = ratingStats.map((match) => {
      /* console.log(match.tooltipInfo.matchDate); */
      match.tooltipInfo.matchDate = new Date(
        match.tooltipInfo.matchDate
      ).toLocaleDateString('en-US', dateFormatOptions);

      return match;
    });

    dataForGraph = ratingStats.map((match) => {
      /* tournamentsTooltip.filter(
        (m) => m.tooltipInfo.matchDate == tooltip.title
      ); */

      return match.ratingAfter.toFixed(0);
    });
  }

  /* if (rankChart) {
    labels = rankChart.map((match) => match.matchName);
    dataForGraph = rankChart.map((match) => match.rank.toFixed(0));
  } */

  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: '',
        data: dataForGraph,
        borderWidth: 3,
        borderColor: `hsla(${colors[0]}, 0.6)`,
        backgroundColor: 'transparent' /* `hsla(${colors[1]}, 0.6)` */,
        font: font,
      },
    ],
  };

  const externalTooltipHandler = (context) => {
    // Tooltip Element
    const { chart, tooltip } = context;
    const tooltipEl = getOrCreateTooltip(chart);

    /* console.log(tournamentsTooltip); */

    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

    if (tooltip.body && ratingStats) {
      const matchesLines = tournamentsTooltip.filter(
        (match) => match.tooltipInfo.matchDate == tooltip.title
      );

      /* console.log(matchesLines); */

      const matchesList = document.createElement('ul');
      matchesLines.forEach((match, i) => {
        console.log(match, i);

        const li = document.createElement('li');

        const matchName = document.createElement('a');
        matchName.href = match.tooltipInfo.mpLink;
        matchName.target = '_blank';
        matchName.innerHTML = match.tooltipInfo.matchName;

        const ratingChange = document.createElement('span');
        ratingChange.innerHTML = match.ratingChange.toFixed(1);
        ratingChange.className = clsx(
          styles.tooltip_ratingChange,
          match.ratingChange.toFixed(1) > 0
            ? styles.gain
            : match.ratingChange.toFixed(1) < 0
            ? styles.loss
            : ''
        );

        li.appendChild(matchName);
        li.appendChild(ratingChange);
        matchesList.appendChild(li);
      });

      const divRoot = tooltipEl.querySelector('div.tooltip');

      // Remove old children
      while (divRoot.firstChild) {
        divRoot.firstChild.remove();
      }

      divRoot.appendChild(matchesList);
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

    // Display, position, and set styles for font
    tooltipEl.style.opacity = 1;
    /* tooltipEl.style.left = positionX + tooltip.caretX + 'px'; */
    tooltipEl.style.top = positionY + tooltip.caretY + 5 + 'px';
    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding =
      tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
    tooltipEl.style.pointerEvents = 'none';

    var offset = tooltip.width + 120;
    if (chart.width / 2 < tooltip.caretX) {
      offset *= -1;
    } else {
      offset *= -0.2;
    }

    // Hidden Code
    tooltipEl.style.left = positionX + tooltip.caretX + offset + 'px';
  };

  const options = {
    responsive: true,
    events: ['mousemove', 'click', 'touchstart', 'touchmove'],
    plugins: {
      legend: {
        display: false,
        /* position: 'top' as const, */
      },
      tooltip: {
        enabled: false,
        position: 'nearest',
        external: ratingStats ? externalTooltipHandler : null,
      },
      /* title: {
        display: true,
        text: 'Chart.js Line Chart',
      }, */
    },
    elements: {
      line: {
        tension: 0.3,
      },
      point: {
        radius: 0 /* 0 makes points hidden */,
        hitRadius: 100,
        pointBackgroundColor: `hsla(${colors[0]}, 0.6)`,
      },
    },
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          font: {
            size: 16,
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
            size: 16,
            family: font,
          },
        },
      },
    },
  };

  return (
    <div className={styles.graphContainer}>
      <Line options={options} data={data} />
    </div>
  );
}
