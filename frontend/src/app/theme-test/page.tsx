'use client';

import { useTheme } from '@/components/ThemeProvider';

export default function ThemeTestPage() {
  const { theme, accent, setTheme, setAccent, resolvedTheme } = useTheme();

  const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
  const accents: Array<'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'teal'> = ['emerald', 'blue', 'violet', 'rose', 'amber', 'teal'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">Theme Feature Test</h1>
        
        {/* Current Theme Display */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Current Theme Settings</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Theme Mode:</span> {theme}</p>
            <p><span className="font-medium">Resolved Theme:</span> {resolvedTheme}</p>
            <p><span className="font-medium">Accent Color:</span> {accent}</p>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Display Mode</h2>
          <div className="grid grid-cols-3 gap-4">
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === t 
                    ? 'accent-border accent-bg text-white' 
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                <div className="text-sm font-medium capitalize">{t}</div>
                {t === 'system' && (
                  <div className="text-xs opacity-75 mt-1">Follows OS</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Accent Color</h2>
          <div className="grid grid-cols-6 gap-4">
            {accents.map((a) => (
              <button
                key={a}
                onClick={() => setAccent(a)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  accent === a 
                    ? 'accent-border accent-bg text-white' 
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
                style={{
                  backgroundColor: accent === a ? undefined : undefined
                }}
              >
                <div className="w-6 h-6 rounded-full mx-auto mb-2 bg-red-500" 
                     style={{ backgroundColor: a === 'emerald' ? '#10b981' : 
                                              a === 'blue' ? '#3b82f6' :
                                              a === 'violet' ? '#8b5cf6' :
                                              a === 'rose' ? '#f43f5e' :
                                              a === 'amber' ? '#f59e0b' :
                                              a === 'teal' ? '#14b8a6' : '#10b981' }} />
                <div className="text-xs font-medium capitalize">{a}</div>
              </button>
            ))}
          </div>
        </div>

        {/* UI Elements Test */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">UI Elements Test</h2>
          <div className="space-y-4">
            <button className="px-4 py-2 accent-bg accent-bg-hover text-white rounded-lg">
              Primary Button
            </button>
            <button className="px-4 py-2 border accent-border accent-border-hover text-slate-700 dark:text-slate-300 rounded-lg">
              Outlined Button
            </button>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded accent-bg focus:accent-ring" />
              <label className="text-sm text-slate-700 dark:text-slate-300">Checkbox with accent color</label>
            </div>
            <input 
              type="text" 
              placeholder="Input with accent focus ring"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none accent-ring focus:ring-2 focus:ring-offset-2"
            />
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full accent-border border-2"></div>
              <span className="text-sm text-slate-700 dark:text-slate-300">Radio button</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Test Instructions:</h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Try different display modes (Light, Dark, System)</li>
            <li>Change accent colors and see UI elements update</li>
            <li>Test System mode by changing your OS theme</li>
            <li>Refresh page to verify persistence</li>
            <li>Navigate to Settings → Themes for more options</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
