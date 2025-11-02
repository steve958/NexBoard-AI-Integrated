"use client";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("system");
    }
  };

  const getIcon = () => {
    if (theme === "system") {
      return "brightness_auto";
    } else if (theme === "dark") {
      return "dark_mode";
    } else {
      return "light_mode";
    }
  };

  const getLabel = () => {
    if (theme === "system") {
      return "Auto";
    } else if (theme === "dark") {
      return "Dark";
    } else {
      return "Light";
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="h-9 px-3 rounded-md hover:bg-white/5 flex items-center gap-2"
      aria-label="Toggle theme"
      title={`Theme: ${getLabel()} (click to cycle)`}
    >
      <span className="material-icons text-sm">{getIcon()}</span>
      <span className="text-xs hidden sm:inline">{getLabel()}</span>
    </button>
  );
}
