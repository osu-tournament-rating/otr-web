import { animate, motion } from 'framer-motion';
import React from 'react';

export default function Tooltip({ startingAnchor = 'left', children }) {
  const status = {
    initial: {
      position: 'absolute',
      top: 46,
      [startingAnchor]: 0,
      opacity: 0,
    },
    animate: {
      top: 56,
      [startingAnchor]: 0,
      opacity: 1,
    },
    exit: {
      top: 46,
      [startingAnchor]: 0,
      opacity: 0,
    },
  };

  return (
    <motion.div
      initial={status.initial}
      animate={status.animate}
      exit={status.exit}
      className={'graphs_basic_tooltip'}
    >
      {children}
    </motion.div>
  );
}
