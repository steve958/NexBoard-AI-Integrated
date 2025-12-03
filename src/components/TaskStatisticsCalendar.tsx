"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import type { Task } from "@/lib/taskTypes";
import type { Column } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import { useTheme } from "@/components/ThemeProvider";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TaskStatisticsCalendarProps = {
  allTasks: { projectId: string; projectName: string; tasks: Task[] }[];
  projectColumns: { projectId: string; columns: Column[] }[];
  daysToShow?: number;
};

export default function TaskStatisticsCalendar({
  allTasks,
  projectColumns,
  daysToShow = 30,
}: TaskStatisticsCalendarProps) {
  const { resolvedTheme } = useTheme();

  // Define colors based on theme
  const createdColor = resolvedTheme === "dark" ? "#63B3ED" : "#1B3F51";
  const createdColorRgba = resolvedTheme === "dark" ? "rgba(99, 179, 237, 0.2)" : "rgba(27, 63, 81, 0.2)";
  const createdColorBar = resolvedTheme === "dark" ? "rgba(99, 179, 237, 0.8)" : "rgba(27, 63, 81, 0.8)";

  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Generate daily data for the last N days
    const dailyData: {
      date: string;
      timestamp: number;
      created: number;
      closed: number;
    }[] = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const dayStart = todayTime - i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const date = new Date(dayStart);

      // Count tasks created on this day
      const createdCount = allTasks.reduce((sum, project) => {
        const tasksCreatedThisDay = project.tasks.filter((task) => {
          if (!task.createdAt) return false;
          const createdTime =
            task.createdAt instanceof Timestamp
              ? task.createdAt.toMillis()
              : new Date(task.createdAt).getTime();
          return createdTime >= dayStart && createdTime < dayEnd;
        }).length;
        return sum + tasksCreatedThisDay;
      }, 0);

      // Count tasks completed on this day (moved to "done" column)
      const closedCount = allTasks.reduce((sum, project) => {
        const projectCols = projectColumns.find(
          (pc) => pc.projectId === project.projectId
        );
        if (!projectCols) return sum;

        const doneColumns = projectCols.columns.filter((col) =>
          col.name.toLowerCase().includes("done")
        );
        const doneColumnIds = new Set(doneColumns.map((col) => col.columnId));

        const tasksClosedThisDay = project.tasks.filter((task) => {
          // Must be in a "done" column
          if (!doneColumnIds.has(task.columnId)) return false;

          // Check if it was updated (moved to done) on this day
          if (!task.updatedAt) return false;
          const updatedTime =
            task.updatedAt instanceof Timestamp
              ? task.updatedAt.toMillis()
              : new Date(task.updatedAt).getTime();
          return updatedTime >= dayStart && updatedTime < dayEnd;
        }).length;

        return sum + tasksClosedThisDay;
      }, 0);

      dailyData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        timestamp: dayStart,
        created: createdCount,
        closed: closedCount,
      });
    }

    return dailyData;
  }, [allTasks, projectColumns, daysToShow]);

  // Prepare data for Chart.js
  const labels = chartData.map((d) => d.date);
  const createdData = chartData.map((d) => d.created);
  const closedData = chartData.map((d) => d.closed);

  const chartConfig = {
    labels,
    datasets: [
      {
        label: "Tasks Created",
        data: createdData,
        borderColor: createdColor,
        backgroundColor: createdColorRgba,
        tension: 0.3,
        fill: true,
      },
      {
        label: "Tasks Closed",
        data: closedData,
        borderColor: "rgb(45, 212, 191)",
        backgroundColor: "rgba(45, 212, 191, 0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const barChartConfig = {
    labels,
    datasets: [
      {
        label: "Tasks Created",
        data: createdData,
        backgroundColor: createdColorBar,
        borderColor: createdColor,
        borderWidth: 1,
      },
      {
        label: "Tasks Closed",
        data: closedData,
        backgroundColor: "rgba(45, 212, 191, 0.8)",
        borderColor: "rgb(45, 212, 191)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "var(--nb-ink)",
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "var(--nb-ink)",
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "var(--nb-ink)",
          stepSize: 1,
          font: {
            size: 11,
          },
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  // Calculate summary statistics
  const totalCreated = createdData.reduce((sum, val) => sum + val, 0);
  const totalClosed = closedData.reduce((sum, val) => sum + val, 0);
  const avgCreated = (totalCreated / daysToShow).toFixed(1);
  const avgClosed = (totalClosed / daysToShow).toFixed(1);

  return (
    <div className="nb-card-elevated rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold nb-brand-text">Task Statistics</h2>
        <div className="text-xs" style={{ color: "color-mix(in srgb, var(--nb-ink) 60%, transparent)" }}>
          Last {daysToShow} days
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--nb-ink) 3%, transparent)" }}>
          <div className="text-xs mb-1" style={{ color: "color-mix(in srgb, var(--nb-ink) 60%, transparent)" }}>
            Total Created
          </div>
          <div className="text-2xl font-bold" style={{ color: createdColor }}>
            {totalCreated}
          </div>
        </div>

        <div className="p-3 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--nb-ink) 3%, transparent)" }}>
          <div className="text-xs mb-1" style={{ color: "color-mix(in srgb, var(--nb-ink) 60%, transparent)" }}>
            Total Closed
          </div>
          <div className="text-2xl font-bold" style={{ color: "rgb(45, 212, 191)" }}>
            {totalClosed}
          </div>
        </div>

        <div className="p-3 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--nb-ink) 3%, transparent)" }}>
          <div className="text-xs mb-1" style={{ color: "color-mix(in srgb, var(--nb-ink) 60%, transparent)" }}>
            Avg Created/Day
          </div>
          <div className="text-2xl font-bold nb-brand-text">
            {avgCreated}
          </div>
        </div>

        <div className="p-3 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--nb-ink) 3%, transparent)" }}>
          <div className="text-xs mb-1" style={{ color: "color-mix(in srgb, var(--nb-ink) 60%, transparent)" }}>
            Avg Closed/Day
          </div>
          <div className="text-2xl font-bold nb-brand-text">
            {avgClosed}
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3 nb-brand-text">Trend Over Time</h3>
        <div style={{ height: "250px" }}>
          <Line data={chartConfig} options={options} />
        </div>
      </div>

      {/* Bar Chart */}
      <div>
        <h3 className="text-sm font-medium mb-3 nb-brand-text">Daily Breakdown</h3>
        <div style={{ height: "250px" }}>
          <Bar data={barChartConfig} options={options} />
        </div>
      </div>
    </div>
  );
}
