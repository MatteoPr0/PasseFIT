import React from 'react';
import {
  Loader2, Dumbbell, ChevronRight, Pencil, Clock, Trash2, GripHorizontal,
  Check, Plus, PlusCircle, Download, Upload, Home, ClipboardList, Database,
  X, ListPlus, Search, ChevronDown, PlayCircle, Zap
} from 'lucide-react';

const icons: Record<string, React.ElementType> = {
  'loader-2': Loader2,
  'dumbbell': Dumbbell,
  'chevron-right': ChevronRight,
  'pencil': Pencil,
  'clock': Clock,
  'trash-2': Trash2,
  'grip-horizontal': GripHorizontal,
  'check': Check,
  'plus': Plus,
  'plus-circle': PlusCircle,
  'download': Download,
  'upload': Upload,
  'home': Home,
  'clipboard-list': ClipboardList,
  'database': Database,
  'x': X,
  'list-plus': ListPlus,
  'search': Search,
  'chevron-down': ChevronDown,
  'play-circle': PlayCircle,
  'zap': Zap
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, className = "" }) => {
  const LucideIcon = icons[name];
  if (!LucideIcon) return null;
  
  return (
    <LucideIcon 
      className={`inline-flex items-center justify-center pointer-events-none ${className}`} 
      size={size} 
      style={{ minWidth: size, minHeight: size, flexShrink: 0 }}
    />
  );
};
