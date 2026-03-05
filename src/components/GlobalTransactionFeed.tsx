import React, { useEffect, useState } from 'react';
import { useContractEvents, TransactionEvent } from '@/hooks/useContractEvents';
import { cn } from '@/lib/utils';

interface ToastItemProps {
  event: TransactionEvent;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ event, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fade in
    const showTimeout = setTimeout(() => setIsVisible(true), 50);
    
    // Start exit animation after 4 seconds
    const exitTimeout = setTimeout(() => {
      setIsExiting(true);
    }, 4000);
    
    // Remove from DOM after exit animation
    const removeTimeout = setTimeout(() => {
      onRemove(event.id);
    }, 4500);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(exitTimeout);
      clearTimeout(removeTimeout);
    };
  }, [event.id, onRemove]);

  const getIcon = () => {
    switch (event.type) {
      case 'register':
        return '👤';
      case 'approve':
        return '✅';
      case 'deposit':
        return '💰';
      case 'withdraw':
        return '💸';
      case 'passive':
        return '🎁';
      default:
        return '📝';
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg backdrop-blur-md",
        "bg-card/90 border border-primary/30",
        "transform transition-all duration-500 ease-out",
        isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <span className="text-lg">{getIcon()}</span>
      <span className="text-sm font-medium text-primary">
        {event.message}
      </span>
    </div>
  );
};

const GlobalTransactionFeed: React.FC = () => {
  const { events, removeEvent } = useContractEvents();
  const [visibleEvents, setVisibleEvents] = useState<TransactionEvent[]>([]);

  useEffect(() => {
    // Only show the latest 5 events
    setVisibleEvents(events.slice(0, 5));
  }, [events]);

  if (visibleEvents.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {visibleEvents.map((event) => (
        <ToastItem 
          key={event.id} 
          event={event} 
          onRemove={removeEvent}
        />
      ))}
    </div>
  );
};

export default GlobalTransactionFeed;
