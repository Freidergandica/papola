import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

interface CountdownTimerProps {
  endsAt: string;
  compact?: boolean;
}

export function CountdownTimer({ endsAt, compact }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeLeft(endsAt);
      setTimeLeft(remaining);
      if (remaining.total <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  if (timeLeft.total <= 0) {
    return (
      <Text className="text-red-500 text-xs font-bold">Expirado</Text>
    );
  }

  if (compact) {
    return (
      <Text className="text-orange-600 text-xs font-bold">
        {timeLeft.hours > 0 ? `${timeLeft.hours}h ${timeLeft.minutes}m` : `${timeLeft.minutes}m ${timeLeft.seconds}s`}
      </Text>
    );
  }

  return (
    <View className="flex-row items-center space-x-1">
      {timeLeft.days > 0 && (
        <TimeBlock value={timeLeft.days} label="D" />
      )}
      <TimeBlock value={timeLeft.hours} label="H" />
      <Text className="text-orange-600 font-bold">:</Text>
      <TimeBlock value={timeLeft.minutes} label="M" />
      <Text className="text-orange-600 font-bold">:</Text>
      <TimeBlock value={timeLeft.seconds} label="S" />
    </View>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <View className="bg-orange-100 rounded-md px-2 py-1 items-center min-w-[32px]">
      <Text className="text-orange-700 font-bold text-sm">
        {String(value).padStart(2, '0')}
      </Text>
      <Text className="text-orange-400 text-[8px]">{label}</Text>
    </View>
  );
}

function getTimeLeft(endsAt: string) {
  const total = new Date(endsAt).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
