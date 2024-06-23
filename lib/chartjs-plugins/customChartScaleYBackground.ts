const plugin = {
  id: 'customCanvasScaleYBackgroundColor',
  beforeDatasetsDraw: (chart, args, options) => {
    const {
      ctx,
      chartArea: { top, bottom, left, right, width, height },
      legend,
      scales: { y },
    } = chart;
    ctx.save();

    ctx.fillStyle = options.color || 'transparent';
    ctx.fillRect(y.left, y.top, y.width, y.height);

    ctx.restore();
  },
};

export default plugin;
