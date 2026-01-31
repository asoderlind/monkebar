import {
  BarChart3,
  History,
  Scale,
  PlusCircle,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

type View = "log" | "analytics" | "history" | "exercises" | "measurements";

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const navItems = [
    { id: "log" as const, label: "Log", icon: PlusCircle },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "history" as const, label: "History", icon: History },
    { id: "exercises" as const, label: "Exercises", icon: Dumbbell },
    { id: "measurements" as const, label: "Weight", icon: Scale },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
