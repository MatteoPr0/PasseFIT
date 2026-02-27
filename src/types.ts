export interface SetData {
  id: string;
  type: 'W' | 'A';
  kg: string | number;
  reps: string | number;
  completed: boolean;
}

export interface ExerciseData {
  id: string;
  name: string;
  notes?: string;
  sets: SetData[];
}

export interface WorkoutData {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  date?: string;
  vol?: number;
  exercises: ExerciseData[];
}

export interface RoutineData {
  id: string;
  name: string;
  exercises: { name: string }[];
}

export interface CustomExercises {
  [category: string]: string[];
}
