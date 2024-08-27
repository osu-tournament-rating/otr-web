import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import styles from './Tooltip.module.css';

export default function Tooltip({ children, content }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.tooltipContainer}>
      {children}
      <div className={styles.parent}>
        <div className={styles.tooltipContent}>{content}</div>
      </div>
    </div>
  );
}
