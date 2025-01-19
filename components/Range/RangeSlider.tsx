'use client';

import { useCallback, useState } from 'react';
import { Range, getTrackBackground } from 'react-range';
import styles from './RangeSlider.module.css';

export type RangeSliderValue = [number, number];

export type RangeSliderProps = {
  /** Class name */
  className?: string;

  /** Initial value */
  value?: RangeSliderValue;

  /** Slider step */
  step?: number;

  /** Minimum value */
  min?: number;

  /** Maximum value */
  max?: number;

  /** Callback for value change */
  onChange?: ({
    min,
    max,
    value,
  }: {
    min: number;
    max: number;
    value: RangeSliderValue;
  }) => void;
};

export default function RangeSlider({
  className = '',
  step = 1,
  min = 1,
  max = 100,
  value = [min, max],
  onChange = () => {},
}: RangeSliderProps) {
  if (min > max) {
    throw new Error('Min must be less than max');
  }

  const validateValues = useCallback(
    (values: RangeSliderValue): RangeSliderValue => {
      let [lower, upper] = values;

      if (lower > upper) {
        upper = [lower, (lower = upper)][0];
      }

      if (lower < min) {
        lower = min;
      }

      if (upper > max) {
        upper = max;
      }

      return [lower, upper];
    },
    [max, min]
  );

  // Slider values can overlap (val[0] being greater than val[1])
  // while the input values are kept clamped to the min and max allowing the track ends
  // to be able to drag past each other while the displayed numbers are always correct
  const [sliderValues, setSliderValues] = useState(validateValues(value));
  const [inputValues, setInputValues] = useState(sliderValues);
  const [lower, upper] = inputValues;

  const setValues = (values: RangeSliderValue) => {
    setInputValues(values);
    setSliderValues(values);
  };

  const onChangeCallback = useCallback(() => {
    onChange({ min, max, value: inputValues });
  }, [inputValues, max, min, onChange]);

  return (
    <div className={styles.container}>
      <div className={styles.rangeValues}>
        <span className={styles[className]}>
          <input
            className={styles.value}
            required
            type={'number'}
            value={lower}
            onChange={(e) => {
              setValues(
                validateValues([
                  isNaN(e.target.valueAsNumber) ? min : e.target.valueAsNumber,
                  upper,
                ])
              );
              onChangeCallback();
            }}
          />
        </span>
        <span className={styles[className]}>
          <input
            className={styles.value}
            required
            type={'number'}
            value={upper}
            onChange={(e) => {
              setValues(
                validateValues([
                  lower,
                  isNaN(e.target.valueAsNumber) ? max : e.target.valueAsNumber,
                ])
              );
              onChangeCallback();
            }}
          />
        </span>
      </div>
      <Range
        step={step}
        min={min}
        max={max}
        values={sliderValues}
        allowOverlap
        onChange={(values) => {
          setSliderValues(values as RangeSliderValue);
          setInputValues(validateValues(values as RangeSliderValue));
        }}
        onFinalChange={() => {
          onChangeCallback();
        }}
        renderTrack={({
          props: { onMouseDown, onTouchStart, ref, style },
          children,
        }) => (
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{ ...style }}
            className={styles.rangeContainer}
          >
            <div
              ref={ref}
              className={styles.rangeTrack}
              style={{
                background: getTrackBackground({
                  values: sliderValues,
                  colors: [
                    'hsla(var(--gray-600))',
                    'hsla(var(--accent-secondary-color))',
                    'hsla(var(--gray-600))',
                  ],
                  min: min,
                  max: max,
                }),
              }}
            >
              {children}
            </div>
          </div>
        )}
        renderThumb={({ props }) => (
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
    </div>
  );
}
