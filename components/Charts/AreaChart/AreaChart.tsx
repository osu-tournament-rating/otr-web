'use client';

import customChartBackground from '@/lib/chartjs-plugins/customChartBackground';
import customChartScaleXBackground from '@/lib/chartjs-plugins/customChartScaleXBackground';
import customChartScaleYBackground from '@/lib/chartjs-plugins/customChartScaleYBackground';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  TimeSeriesScale,
  Title,
  Tooltip,
} from 'chart.js';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import styles from './AreaChart.module.css';

import 'chartjs-adapter-date-fns';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
  TimeSeriesScale
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

function formatDateTooltip(date) {
  const year = date.toLocaleString('default', { year: 'numeric' });
  const month = date.toLocaleString('default', {
    month: '2-digit',
  });
  const day = date.toLocaleString('default', { day: '2-digit' });

  return [year, month, day].join('-');
}

export default function AreaChart({
  ratingStats,
  rankChart,
}: {
  ratingStats?: [];
  rankChart?: [];
}) {
  const [colors, setColors] = useState<string[]>([]);
  const [font, setFont] = useState('');
  const [textColor, setTextColor] = useState([]);
  const [canvasColor, setCanvasColor] = useState([undefined, undefined]);
  const [canvasInnerLinesColor, setCanvasInnerLinesColor] = useState([
    undefined,
    undefined,
  ]);
  const [canvasScalesColor, setCanvasScalesColor] = useState([
    undefined,
    undefined,
  ]);
  const [minMaxDates, setMinMaxDates] = useState([]);

  const { theme } = useTheme();

  /* get variables of colors from CSS */
  useEffect(() => {
    setCanvasColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-background-dark'
      ),
    ]);
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
    setCanvasScalesColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-scales-background-white'
      ),
      getComputedStyle(document.documentElement).getPropertyValue(
        '--chart-canvas-scales-background-dark'
      ),
    ]);
  }, []);

  const dateFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

  let labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
  let dataForGraph: number[] = labels.map(() => Math.ceil(Math.random() * 100));
  let tournamentsTooltip: object[];

  const formatDate = (date = new Date()) => {
    const year = date.toLocaleString('default', { year: 'numeric' });
    const month = date.toLocaleString('default', {
      month: '2-digit',
    });
    const day = date.toLocaleString('default', { day: '2-digit' });

    return [year, month, day].join('-');
  };

  if (ratingStats) {
    labels = ratingStats.map((day) => {
      return new Date(day[0].timestamp).toLocaleDateString(
        'en-US',
        dateFormatOptions
      );
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
        return {
          x: new Date(day[day.length - 1].timestamp),
          y: day[day.length - 1].ratingAfter.toFixed(0),
        };
      }

      if (day.length === 1) {
        return {
          x: new Date(day[0].timestamp),
          y: day[0].ratingAfter.toFixed(0),
        };
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
        borderColor: colors[0]
          ? theme === 'light'
            ? `hsla(${colors[0]}, 0.6)`
            : `hsla(${colors[0]}, 0.82)`
          : 'transparent',
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
      const headerDate = document.createElement('span');
      headerDate.className = styles.headerDate;
      matchesLines.forEach((match) => (headerDate.innerHTML = match.timestamp));

      header.appendChild(headerProperty);
      header.appendChild(headerValue);
      header.appendChild(headerDate);

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
    tooltipEl.style.top = positionY + tooltip.caretY + 8 + 'px';
    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding =
      tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
    tooltipEl.style.pointerEvents = 'none';

    var offset = tooltip.width + 80; /* 120 */
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
      customCanvasBackgroundColor: {
        color: canvasColor[0]
          ? theme === 'light'
            ? `hsl(${canvasColor[0]})`
            : `hsl(${canvasColor[1]})`
          : undefined,
      },
      customCanvasScaleXBackgroundColor: {
        color: canvasScalesColor[0]
          ? theme === 'light'
            ? `hsl(${canvasScalesColor[0]})`
            : `hsl(${canvasScalesColor[1]})`
          : 'transparent',
      },
      customCanvasScaleYBackgroundColor: {
        color: canvasScalesColor[0]
          ? theme === 'light'
            ? `hsl(${canvasScalesColor[0]})`
            : `hsl(${canvasScalesColor[1]})`
          : 'transparent',
      },
    },
    elements: {
      line: {
        tension: 0.3,
      },
      point: {
        radius: 0 /* 0 makes points hidden */,
        hitRadius: 200,
        pointBackgroundColor: colors[0]
          ? theme === 'light'
            ? `hsla(${colors[0]}, 0.6)`
            : `hsla(${colors[0]})`
          : 'transparent',
      },
    },
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        /* type: 'timeseries', */
        time: {
          unit: 'month',
          displayFormats: {
            day: 'MMM dd, yyyy',
            week: 'MMM dd, yyyy',
            month: 'MMM dd, yyyy',
            year: 'MMM dd, yyyy',
          },
        },
        min: formatDate(dataForGraph[0].x),
        max: formatDate(dataForGraph[dataForGraph.length - 1].x),
        ticks: {
          font: {
            size: 16,
            family: font,
          },
          color:
            theme === 'light'
              ? `hsla(${textColor[0]})`
              : `hsla(${textColor[1]})`,
          autoSkip: true,
          maxTicksLimit: 10,
          major: { enabled: true },
          z: 2,
          source: 'auto',
        },
        grid: {
          color: canvasInnerLinesColor[0]
            ? theme === 'light'
              ? `hsla(${canvasInnerLinesColor[0]})`
              : `hsla(${canvasInnerLinesColor[1]})`
            : 'transparent',
        },
        border: {
          display: false,
        },
      },
      y: {
        border: {
          display: false,
        },
        grid: {
          color: canvasInnerLinesColor[0]
            ? theme === 'light'
              ? `hsla(${canvasInnerLinesColor[0]})`
              : `hsla(${canvasInnerLinesColor[1]})`
            : 'transparent',
        },
        ticks: {
          font: {
            size: 16,
            family: font,
          },
          color:
            theme === 'light'
              ? `hsla(${textColor[0]})`
              : `hsla(${textColor[1]})`,
          autoSkip: true,
          maxTicksLimit: 6,
          precision: 0,
          stepSize: 15,
          z: 2,
        },
      },
    },
  };

  return (
    <div className={styles.graphContainer}>
      <Line
        options={options}
        data={data}
        plugins={[
          customChartBackground,
          customChartScaleXBackground,
          customChartScaleYBackground,
        ]}
      />
    </div>
  );
}
