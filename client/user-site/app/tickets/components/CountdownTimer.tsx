import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  initTime: number; // Expects time in milliseconds (e.g., 60000 for 1 minute)
  onTimeOut?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ initTime, onTimeOut }) => {
  // 1. Track the actual remaining time in state
  const [msLeft, setMsLeft] = useState<number>(initTime);

  // 2. Helper function to parse raw milliseconds into readable units
  const calculateTimeLeft = (timeInMs: number): TimeLeft => {
    if (timeInMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return {
      days: Math.floor(timeInMs / (1000 * 60 * 60 * 24)),
      hours: Math.floor((timeInMs / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((timeInMs / 1000 / 60) % 60),
      seconds: Math.floor((timeInMs / 1000) % 60),
    };
  };

  useEffect(() => {
    // Sync state if initTime changes externally
    setMsLeft(initTime);
  }, [initTime]);

  useEffect(() => {
    // 3. Handle timeout condition immediately
    if (msLeft <= 0) {
      if (onTimeOut) onTimeOut();
      return;
    }

    // 4. Subtract 1000ms every second
    const timer = setInterval(() => {
      setMsLeft((prev) => {
        const nextTime = prev - 1000;
        if (nextTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [msLeft, onTimeOut]); // Keep track of msLeft updates

  const timeLeft = calculateTimeLeft(msLeft);
  const formatNumber = (num: number): string => String(num).padStart(2, '0');

  return (
    <div style={styles.container}>
      <div style={styles.timeBox}><span style={msLeft <= 60000 ? styles.timeUrgent : styles.time}>{formatNumber(timeLeft.days)}</span><span style={styles.label}>Days</span></div>
      <div style={styles.timeBox}><span style={msLeft <= 60000 ? styles.timeUrgent : styles.time}>{formatNumber(timeLeft.hours)}</span><span style={styles.label}>Hours</span></div>
      <div style={styles.timeBox}><span style={msLeft <= 60000 ? styles.timeUrgent : styles.time}>{formatNumber(timeLeft.minutes)}</span><span style={styles.label}>Mins</span></div>
      <div style={styles.timeBox}><span style={msLeft <= 60000 ? styles.timeUrgent : styles.time}>{formatNumber(timeLeft.seconds)}</span><span style={styles.label}>Secs</span></div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', gap: '15px', fontFamily: 'monospace', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  timeBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f0f0f0', padding: '10px 15px', borderRadius: '5px', minWidth: '60px' },
  time: { fontSize: '2rem', fontWeight: 'bold', color: '#333' },
  timeUrgent: { fontSize: '2rem', fontWeight: 'bold', color: '#ff0000' },
  label: { fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }
};

export default CountdownTimer;
