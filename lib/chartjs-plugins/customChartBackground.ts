const plugin = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart, args, options) => {
    const {
      ctx,
      chartArea: { top, left, width, height },
    } = chart;
    ctx.save();

    ctx.fillStyle = options.color || 'transparent';
    ctx.fillRect(left, top, width, height);
    ctx.restore();
  },
};

export default plugin;
