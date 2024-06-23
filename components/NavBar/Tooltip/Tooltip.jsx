import React from "react";
import styles from "./Tooltip.module.css";

export default function Tooltip({ children, content }) {
  return (
    <div className={styles.tooltipContainer}>
      {children}
      <span className={styles.tooltipContent}>{content}</span>
    </div>
  );
}
