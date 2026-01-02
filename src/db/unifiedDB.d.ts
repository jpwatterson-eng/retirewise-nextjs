// This tells TS: "I promise these functions exist in the JS file"
declare module '@/db/unifiedDB' {
  import { Project, TimeLog } from '@/types';
  export function getAllProjects(): Promise<Project[]>;
  export function getActiveProjects(): Promise<Project[]>;
  export function createTimeLog(log: Partial<TimeLog>): Promise<string>;
  export function useAuth(): { user: any; loading: boolean };
}