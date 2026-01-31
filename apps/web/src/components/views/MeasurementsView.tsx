import { useState } from "react";
import {
  useWeightMeasurements,
  useCreateMeasurement,
  useDeleteMeasurement,
} from "@/hooks/useMeasurements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

export function MeasurementsView() {
  const { data: measurements, isLoading } = useWeightMeasurements();
  const createMutation = useCreateMeasurement();
  const deleteMutation = useDeleteMeasurement();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Sort measurements by date for the chart (oldest first)
  const chartData = measurements
    ? [...measurements]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((m) => ({
          date: format(parseISO(m.date), "MMM d"),
          fullDate: m.date,
          weight: m.value,
        }))
    : [];

  // Calculate stats
  const latestWeight = measurements?.[0]?.value;
  const previousWeight = measurements?.[1]?.value;
  const weightChange =
    latestWeight && previousWeight ? latestWeight - previousWeight : null;

  // Find min and max for the chart
  const weights = chartData.map((d) => d.weight);
  const minWeight = weights.length > 0 ? Math.min(...weights) - 1 : 0;
  const maxWeight = weights.length > 0 ? Math.max(...weights) + 1 : 100;

  const handleAddWeight = () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;

    createMutation.mutate(
      {
        type: "weight",
        value: weight,
        unit: "kg",
        date: newDate,
      },
      {
        onSuccess: () => {
          setIsAddModalOpen(false);
          setNewWeight("");
          setNewDate(format(new Date(), "yyyy-MM-dd"));
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this measurement?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading measurements...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weight</h1>
        <Button onClick={() => setIsAddModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Current Weight Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Weight</p>
                <p className="text-3xl font-bold">
                  {latestWeight ? `${latestWeight} kg` : "—"}
                </p>
              </div>
            </div>
            {weightChange !== null && (
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  weightChange < 0
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : weightChange > 0
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {weightChange < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : weightChange > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : null}
                {weightChange > 0 ? "+" : ""}
                {weightChange.toFixed(1)} kg
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weight Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weight History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    domain={[minWeight, maxWeight]}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} kg`, "Weight"]}
                    labelFormatter={(label) => label}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurement History List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {measurements && measurements.length > 0 ? (
            <div className="space-y-2">
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="font-medium">{measurement.value} kg</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(measurement.date), "EEEE, MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(measurement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No measurements yet. Add your first weight measurement!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Weight Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Weight Measurement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 75.5"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddWeight}
              disabled={!newWeight || createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
