'use client';

import { useEffect, useState } from 'react';

type Preference = 'claro' | 'oscuro';

export function ThemeSwitcher() {
  const [preference, setPreference] = useState<Preference>('oscuro');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('portal-theme');
      if (saved === 'claro' || saved === 'oscuro') setPreference(saved);
    } catch {}
  }, []);

  function change(value: Preference) {
    setPreference(value);
    try {
      localStorage.setItem('portal-theme', value);
    } catch {}
    document.documentElement.dataset.portalTheme = value;
  }

  return <fieldset className="theme-switcher" aria-label="Tema del portal">
    <legend className="sr-only">Tema del portal</legend>
    {([['claro', '☀', 'Claro'], ['oscuro', '☾', 'Oscuro']] as const).map(([value, icon, label]) =>
      <label key={value} title={label}><input type="radio" name="portal-theme" value={value} checked={preference === value} onChange={() => change(value)} /><span aria-hidden="true">{icon}</span><span className="sr-only">{label}</span></label>)}
  </fieldset>;
}
