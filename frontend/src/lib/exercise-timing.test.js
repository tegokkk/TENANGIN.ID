import { describe, expect, it } from 'vitest';
import { getExercisePhase } from './exercise-timing.js';

describe('Panduan latihan mengikuti durasi setiap langkah', () => {
  it('mengikuti durasi yang berbeda dan mengulang siklus saat diperlukan', () => {
    const steps = [{ seconds: 30 }, { seconds: 20 }, { seconds: 10 }];
    expect(getExercisePhase(steps, 29)).toEqual({ index: 0, secondsToNext: 1 });
    expect(getExercisePhase(steps, 30)).toEqual({ index: 1, secondsToNext: 20 });
    expect(getExercisePhase(steps, 50)).toEqual({ index: 2, secondsToNext: 10 });
    expect(getExercisePhase(steps, 60)).toEqual({ index: 0, secondsToNext: 30 });
  });
  it('langkah berikutnya tetap aktif setelah pengatur waktu bergerak', () => {
    const steps = [{ seconds: 30 }, { seconds: 20 }];
    const { secondsToNext } = getExercisePhase(steps, 8);
    expect(getExercisePhase(steps, 8 + secondsToNext).index).toBe(1);
    expect(getExercisePhase(steps, 9 + secondsToNext).index).toBe(1);
    expect(getExercisePhase([], 8)).toEqual({ index: 0, secondsToNext: 0 });
  });
});
