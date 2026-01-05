import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Minus } from "lucide-react";

interface SetInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "weight" | "reps";
  value: number;
  onAccept: (value: number) => void;
}

export function SetInputModal({
  open,
  onOpenChange,
  type,
  value,
  onAccept,
}: SetInputModalProps) {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value, open]);

  const increment = type === "weight" ? 2.5 : 1;

  const handleIncrement = () => {
    setCurrentValue((prev) => prev + increment);
  };

  const handleDecrement = () => {
    setCurrentValue((prev) => Math.max(0, prev - increment));
  };

  const handleAccept = () => {
    onAccept(currentValue);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCurrentValue(value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Set {type === "weight" ? "Weight (kg)" : "Reps"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            className="h-12 w-12"
          >
            <Minus className="h-6 w-6" />
          </Button>
          <div className="text-4xl font-bold w-24 text-center">
            {type === "weight" ? currentValue.toFixed(1) : currentValue}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            className="h-12 w-12"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAccept}>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
