const HALF_PI = Math.PI / 2;

const SHAPES = Object.freeze({
  linear: (progress) => progress,
  equalPowerIn: (progress) => Math.sin(progress * HALF_PI),
  equalPowerOut: (progress) => 1 - Math.cos(progress * HALF_PI),
});

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export function createRamp({ startTime, startValue, endValue, duration, shape = 'linear' }) {
  if (![startTime, startValue, endValue].every(isFiniteNumber)) {
    throw new RangeError('startTime, startValue and endValue must be finite numbers');
  }
  if (!isFiniteNumber(duration) || duration <= 0) {
    throw new RangeError(`duration must be a positive number: ${String(duration)}`);
  }
  if (!Object.hasOwn(SHAPES, shape)) {
    throw new RangeError(`Unknown ramp shape: ${String(shape)}`);
  }
  return Object.freeze({
    startTime,
    startValue,
    endTime: startTime + duration,
    endValue,
    shape,
  });
}

export function rampValueAt(ramp, time) {
  if (time <= ramp.startTime) {
    return ramp.startValue;
  }
  if (time >= ramp.endTime) {
    return ramp.endValue;
  }
  const progress = (time - ramp.startTime) / (ramp.endTime - ramp.startTime);
  return ramp.startValue + (ramp.endValue - ramp.startValue) * SHAPES[ramp.shape](progress);
}

export function rampFrom(previous, now, endValue, duration, shape) {
  return createRamp({
    startTime: now,
    startValue: rampValueAt(previous, now),
    endValue,
    duration,
    shape,
  });
}

// AudioParam has no sine ramp, so curved shapes are approximated with linear segments.
export function rampPoints(ramp, segments) {
  if (!Number.isInteger(segments) || segments <= 0) {
    throw new RangeError(`segments must be a positive integer: ${String(segments)}`);
  }
  if (ramp.shape === 'linear') {
    return [{ time: ramp.endTime, value: ramp.endValue }];
  }
  const duration = ramp.endTime - ramp.startTime;
  return Array.from({ length: segments }, (_, index) => {
    const time = index === segments - 1
      ? ramp.endTime
      : ramp.startTime + (duration * (index + 1)) / segments;
    return { time, value: rampValueAt(ramp, time) };
  });
}
