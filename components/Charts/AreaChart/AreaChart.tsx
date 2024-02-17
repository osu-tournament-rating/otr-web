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
    labels = ratingStats.map((day) => {
      return new Date(
        day[0].timestamp /* tooltipInfo.matchDate */
      ).toLocaleDateString('en-US', dateFormatOptions);
    });

    tournamentsTooltip = ratingStats.map((day) => {
      let matches = [];
      day.forEach((match) => {
        match.timestamp = new Date(match.timestamp).toLocaleDateString(
          'en-US',
          dateFormatOptions
        );

        return matches.push(match);
      });
      return matches;
    });

    dataForGraph = ratingStats.map((day) => {
      if (day.length > 1) {
        return day[day.length - 1].ratingAfter.toFixed(0);
      }

      if (day.length === 1) {
        return day[0].ratingAfter.toFixed(0);
      }
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
        backgroundColor: 'transparent',
        font: font,
      },
    ],
  };

  const externalTooltipHandler = (context) => {
    // Tooltip Element
    const { chart, tooltip } = context;
    const tooltipEl = getOrCreateTooltip(chart);

    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

    if (tooltip.body && ratingStats) {
      const matchesLines = new Set(
        ...tournamentsTooltip.filter((day) => day[0].timestamp == tooltip.title)
      );

      /* TOOLTIP HEADER */
      const header = document.createElement('div');
      header.className = styles.header;
      const headerProperty = document.createElement('span');
      headerProperty.className = styles.headerProperty;
      headerProperty.innerHTML = 'Rating:';
      const headerValue = document.createElement('span');
      headerValue.className = styles.headerValue;
      headerValue.innerHTML = tooltip.body[0].lines[0];

      header.appendChild(headerProperty);
      header.appendChild(headerValue);

      const matchesList = document.createElement('ul');
      matchesLines.forEach((match) => {
        const li = document.createElement('li');

        const matchName = document.createElement('a');
        matchName.href = match?.matchOsuId
          ? `https://osu.ppy.sh/mp/${match?.matchOsuId}`
          : '#';
        matchName.target = match?.matchOsuId ? '_blank' : '_self';
        matchName.innerHTML = match.name;

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

      divRoot.appendChild(header);
      divRoot.appendChild(matchesList);
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

    // Display, position, and set styles for font
    tooltipEl.style.opacity = 1;
    tooltipEl.style.top = positionY + tooltip.caretY + 5 + 'px';
    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding =
      tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
    tooltipEl.style.pointerEvents = 'none';

    var offset = tooltip.width + 40; /* 120 */
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
      },
      tooltip: {
        enabled: false,
        position: 'nearest',
        external: ratingStats ? externalTooltipHandler : null,
      },
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
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        ticks: {
          font: {
            size: 16,
            family: font,
          },
          autoSkip: true,
          maxTicksLimit: 6,
          precision: 0,
          stepSize: 15,
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
