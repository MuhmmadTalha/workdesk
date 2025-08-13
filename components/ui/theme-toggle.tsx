
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useCallback } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Use callback to avoid hydration mismatch and update instantly
  const handleToggle = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    // Force update of document class for instant effect
    if (typeof window !== 'undefined') {
      if (resolvedTheme === 'dark') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  }, [resolvedTheme, setTheme]);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={handleToggle}
      className="fixed top-4 right-4 z-50 rounded-full shadow-md transition-colors"
    >
      {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
