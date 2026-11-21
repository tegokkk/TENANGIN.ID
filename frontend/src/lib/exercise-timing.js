export function getExercisePhase(instructions, elapsedSeconds) {
  if (!instructions.length) return { index: 0, secondsToNext: 0 };
  const durations = instructions.map((step) => Math.max(1, Number(step.seconds) || 4));
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  let position = Math.max(0, elapsedSeconds) % total;
  for (let index = 0; index < durations.length; index++) {
    if (position < durations[index]) return { index, secondsToNext: durations[index] - position };
    position -= durations[index];
  }
  return { index: 0, secondsToNext: durations[0] };
}
