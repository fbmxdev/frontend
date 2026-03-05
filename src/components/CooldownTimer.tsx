import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CooldownTimerProps {
  targetTime: number;
  onComplete?: () => void;
}

export function CooldownTimer({ targetTime, onComplete }: CooldownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = targetTime - now;
      return remaining > 0 ? remaining : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining === 0 && onComplete) {
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onComplete]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-2 text-success">
        <Clock className="h-4 w-4" />
        <span className="font-medium">Ready</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span className="font-mono font-medium">
        {formatNumber(hours)}:{formatNumber(minutes)}:{formatNumber(seconds)}
      </span>
    </div>
  );
}
