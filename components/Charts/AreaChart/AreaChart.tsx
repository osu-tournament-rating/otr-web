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

/*
const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div');

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = styles.tooltip;

    const table = document.createElement('table');
    table.style.margin = '0px';

    tooltipEl.appendChild(table);
    chart.canvas.parentNode.appendChild(tooltipEl);
  }

  return tooltipEl;
};

export const externalTooltipHandler = (context) => {
  // Tooltip Element
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);



  // Hide if no tooltip
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  // Set Text
  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map((b) => b.lines);

    const tableHead = document.createElement('thead');

    titleLines.forEach((title) => {
      const tr = document.createElement('tr');
      tr.style.borderWidth = 0;

      const th = document.createElement('th');
      th.style.borderWidth = 0;
      const text = document.createTextNode(title);

      th.appendChild(text);
      tr.appendChild(th);
      tableHead.appendChild(tr);
    });

    const tableBody = document.createElement('tbody');
    bodyLines.forEach((body, i) => {
      const colors = tooltip.labelColors[i];

      const span = document.createElement('span');
      span.style.background = colors.backgroundColor;
      span.style.borderColor = colors.borderColor;
      span.style.borderWidth = '2px';
      span.style.marginRight = '10px';
      span.style.height = '10px';
      span.style.width = '10px';
      span.style.display = 'inline-block';

      const tr = document.createElement('tr');
      tr.style.backgroundColor = 'inherit';
      tr.style.borderWidth = 0;

      const td = document.createElement('td');
      td.style.borderWidth = 0;

      const text = document.createTextNode(body);

      td.appendChild(span);
      td.appendChild(text);
      tr.appendChild(td);
      tableBody.appendChild(tr);
    });

    const tableRoot = tooltipEl.querySelector('table');

    // Remove old children
    while (tableRoot.firstChild) {
      tableRoot.firstChild.remove();
    }

    // Add new children
    tableRoot.appendChild(tableHead);
    tableRoot.appendChild(tableBody);
  }

  const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

  // Display, position, and set styles for font
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY + 'px';
  tooltipEl.style.font = tooltip.options.bodyFont.string;
  tooltipEl.style.padding =
    tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
};
 */

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
      getComputedStyle(document.documentElement).getPropertyValue('--blue-600'),
      getComputedStyle(document.documentElement).getPropertyValue('--blue-400'),
    ]);
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
        /* position: 'top' as const, */
      },
      tooltip: {
        enabled: false,
        position: 'nearest',
        /* external: externalTooltipHandler, */
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
        hitRadius: 0,
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

  const dateFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

  let labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
  let dataForGraph: number[] = labels.map(() => Math.ceil(Math.random() * 100));

  if (ratingStats) {
    labels = ratingStats.map((match) =>
      new Date(match.tooltipInfo.matchDate).toLocaleDateString(
        'en-US',
        dateFormatOptions
      )
    );
    dataForGraph = ratingStats.map((match) => match.ratingAfter.toFixed(0));
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

  return (
    <div className={styles.graphContainer}>
      <Line options={options} data={data} />
    </div>
  );
}
