import { animate, motion } from 'framer-motion';
import React from 'react';

const status = {
  initial: {
    position: 'absolute',
    bottom: 0,
    opacity: 0,
  },
  animate: {
    bottom: -40,
    opacity: 1,
  },
};

export default function Tooltip({ children }) {
  return (
    <motion.div
      initial={status.initial}
      animate={status.animate}
      className={'graphs_basic_tooltip'}
    >
      {children}
    </motion.div>
  );
}
