'use client';
import { useEffect, useState } from 'react';
import { Range, getTrackBackground } from 'react-range';
import styles from './RangeSlider.module.css';

export default function RangeSlider({
  name,
  step = 1,
  min = 1,
  max,
  rtl = false,
  value,
  setParamsToPush,
}: {
  name: string;
  step?: number;
  min?: number;
  max: number;
  rtl?: boolean;
  value: any;
  setParamsToPush: any;
}) {
  function checkValues(array: any) {
    if (array.length > 2) {
      array.length = 2;
    }
    if (array.length !== 1) {
      array = array.map(
        (value: string, index: number) =>
          !isNaN(parseInt(value)) ? parseInt(value) : index === 0 ? min : max
        /* return number > 0 && number < 1 ? number * 100 : number; */
      );
    }
    if (array?.length === 1) {
      array[0] = parseInt(array[0]);
      array[1] = max;
    }
    if (array?.length === 2) {
      if (array[0] > array[1]) {
        array.reverse();
      }
      if (array[0] < min) {
        array[0] = min;
      }
      if (array[1] > max) {
        array[1] = max;
      }
    }
    return array;
  }

  const [values, setValues] = useState([min, max]);

  useEffect(() => {
    setValues(value !== undefined ? checkValues(value) : [min, max]);

    return () => {};
  }, [value]);

  return (
    <div className={styles.container}>
      <div className={styles.rangeValues}>
        <span className={styles[name]}>
          <input
            type="number"
            className={styles.value}
            value={values[0]}
            onChange={(e) => {
              setValues((prev: any) => [
                Math.max(min - 1, Math.min(values[1], Number(e.target.value))) <
                1
                  ? ''
                  : Math.max(min, Math.min(values[1], Number(e.target.value))),
                prev[1],
              ]);
              setParamsToPush((prev: any) => ({
                ...prev,
                [name]: [
                  Math.max(
                    min - 1,
                    Math.min(values[1], Number(e.target.value))
                  ) < min
                    ? min
                    : Math.min(max, Number(e.target.value)),
                  values[1],
                ],
              }));
            }}
            required
          />
        </span>
        <span className={styles[name]}>
          <input
            type="number"
            className={styles.value}
            value={values[1]}
            onChange={(e) => {
              setValues((prev: any) => [
                prev[0],
                Math.min(max, Number(e.target.value)) === 0
                  ? ''
                  : Math.min(max, Number(e.target.value)),
              ]);
              setParamsToPush((prev: any) => ({
                ...prev,
                [name]: [
                  values[0],
                  Math.min(max, Number(e.target.value)) < values[0]
                    ? values[0]
                    : Math.min(max, Number(e.target.value)),
                ],
              }));
            }}
            required
          />
        </span>
      </div>
      <Range
        step={step}
        min={min}
        max={max}
        rtl={rtl}
        values={values}
        allowOverlap={false}
        onChange={(values) => {
          setValues(values);
          setParamsToPush((prev) => ({
            ...prev,
            [name]: values,
          }));
        }}
        renderTrack={({ props, children }) => (
          <div
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
            style={{
              ...props.style,
            }}
            className={styles.rangeContainer}
          >
            <div
              ref={props.ref}
              style={{
                background: getTrackBackground({
                  values,
                  colors: [
                    'hsla(var(--gray-600))',
                    'hsla(var(--accent-secondary-color))',
                    'hsla(var(--gray-600))',
                  ],
                  min: min,
                  max: max,
                  rtl,
                }),
              }}
              className={styles.rangeTrack}
            >
              {children}
            </div>
          </div>
        )}
        renderThumb={({ props, isDragged }) => (
          <div
            {...props}
            key={props.key}
            style={{
              ...props.style,
            }}
            className={styles.rangeSelector}
          />
        )}
      />
      {/* <input
        type="hidden"
        name={name}
        value={JSON.stringify({ min: values[0], max: values[1] })}
      /> */}
    </div>
  );
}
