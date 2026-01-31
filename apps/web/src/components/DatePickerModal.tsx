import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MuscleGroupCalendar } from "@/components/MuscleGroupCalendar";

interface DatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export function DatePickerModal({
  open,
  onOpenChange,
  selectedDate,
  onDateSelect,
}: DatePickerModalProps) {
  const handleDateSelect = (date: string) => {
    onDateSelect(date);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Select Date</DialogTitle>
        </DialogHeader>

        <MuscleGroupCalendar
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
          showLegend={false}
          allowAllDates={true}
          wrapped={false}
          initialMonth={selectedDate}
        />
      </DialogContent>
    </Dialog>
  );
}
