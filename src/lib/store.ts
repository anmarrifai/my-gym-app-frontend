import { writable } from 'svelte/store';

// Store for current day
export const currentDay = writable<number | null>(null);


export const startDate = writable<string | null>(null);
export const splitId = writable<string | null>(null);
export const userId = writable<string | null>(null);


export type DailyWorkoutExercise = {
  exercise_id: string;
  exercise_name: string;
  description: string;
  exercise_rank: number;
  loggedData: { reps: string; weight: string }[];
  previousLogs: Record<string, { set_number: number; reps: string; weight: string }[]> | null;
  showLogs?: boolean;
  completed: boolean;
  editMode: boolean;
};

export const dailyWorkoutStore = writable<DailyWorkoutExercise[]>([]);