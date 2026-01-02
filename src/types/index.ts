export type Perspective = 'builder' | 'contributor' | 'integrator' | 'experimenter';

export interface Project {
  id: string;
  name: string;
  perspective: Perspective;
  status: 'active' | 'completed' | 'paused' | 'archived';
  targetHours: number;
  totalHoursLogged: number;
  icon?: string;
  color?: string;
}

export interface TimeLog {
  id?: string;
  projectId: string;
  projectName: string;
  perspective: Perspective;
  hours: number;
  date: string; // ISO string
  notes: string;
  timestamp: any; // Firestore Timestamp
}