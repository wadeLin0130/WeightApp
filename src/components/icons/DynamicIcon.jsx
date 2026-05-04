import {
  Plus,
  Flame,
  Utensils,
  Activity,
  Dumbbell,
  Coffee,
  Apple,
  Pizza,
  Carrot,
  Fish,
  Beef,
  Bike,
  Zap,
  HeartPulse,
  Music,
  Sun,
  Moon,
  Star,
  Heart,
  Target,
} from 'lucide-react';

export function ShuttlecockIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 18a2 2 0 1 0 4 0v-2h-4v2z" />
      <path d="M10 16L5 3l7 4 7-4-5 13" />
      <path d="M12 16V7" />
      <path d="M7.5 10h9" />
    </svg>
  );
}

export function WeightScaleIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="4" />
      <rect width="10" height="5" x="7" y="7" rx="1" />
      <path d="M12 12V9" />
    </svg>
  );
}

const ICON_MAP = {
  Plus,
  Flame,
  Utensils,
  Activity,
  Dumbbell,
  Coffee,
  Apple,
  Pizza,
  Carrot,
  Fish,
  Beef,
  Bike,
  Zap,
  HeartPulse,
  Shuttlecock: ShuttlecockIcon,
  Music,
  Sun,
  Moon,
  Star,
  Heart,
  Target,
};

export function DynamicIcon({ name, className }) {
  const IconCmp = ICON_MAP[name] || Activity;
  return <IconCmp className={className} />;
}
