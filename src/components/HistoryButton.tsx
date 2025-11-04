import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryButtonProps {
  onClick: () => void;
}

export function HistoryButton({ onClick }: HistoryButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="bg-white/80 !rounded-full"
    >
      <History className="w-5 h-5" />
    </Button>
  );
}

