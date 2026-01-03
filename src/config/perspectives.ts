// src/config/perspectives.ts

export interface PerspectiveConfig {
  id: string;
  label: string;
  color: string;
  bg: string;
  bar: string;
  icon: string;
}

export const PERSPECTIVES: Record<string, PerspectiveConfig> = {
  builder: {
    id: "builder",
    label: "Builder",
    icon: "🏗️",
    color: "text-blue-600",
    bg: "bg-blue-50",
    bar: "bg-blue-600",
  },
  contributor: {
    id: "contributor",
    label: "Contributor",
    icon: "🤝",
    color: "text-green-600",
    bg: "bg-green-50",
    bar: "bg-green-600",
  },
  integrator: {
    id: "integrator",
    label: "Integrator",
    icon: "🧩",
    color: "text-purple-600",
    bg: "bg-purple-50",
    bar: "bg-purple-600",
  },
  experimenter: {
    id: "experimenter",
    label: "Experimenter",
    icon: "🔬",
    color: "text-orange-600",
    bg: "bg-orange-50",
    bar: "bg-orange-600",
  },
};