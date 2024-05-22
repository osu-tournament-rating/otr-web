const plugin = {
  id: 'customCanvasScaleXBackgroundColor',
  beforeDatasetsDraw: (chart, args, options) => {
    const {
      ctx,
      chartArea: { top, bottom, left, right, width, height },
      legend,
      scales: { x, y },
    } = chart;
    ctx.save();

    ctx.fillStyle = options.color || 'transparent';
    ctx.fillRect(x.left, x.top, x.width, x.height);

    ctx.restore();
  },
};

export default plugin;
