'use client';

import { useEffect, useState } from 'react';

const formatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const numericDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
});

function currentDate() {
  const now = new Date();
  const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return {
    iso: numericDate.format(now),
    label: `${parts.weekday} ${parts.day} de ${parts.month}, ${parts.year}`,
  };
}

export function EditionDate() {
  const [date, setDate] = useState<ReturnType<typeof currentDate> | null>(null);

  useEffect(() => {
    const refresh = () => {
      const today = currentDate();
      setDate(previous => previous?.iso === today.iso ? previous : today);
    };
    refresh();
    const interval = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return <div className="edition-date">
    <span className="edition-date-label" aria-hidden="true">[ SISTEMA / FECHA ]</span>
    {date && <time key={date.iso} dateTime={date.iso}>{date.label}</time>}
  </div>;
}
