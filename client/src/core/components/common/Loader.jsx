import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export default function Loader({ size = 'md', className, text }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={clsx('animate-spin text-primary-500', sizes[size])} />
      {text && <p className="text-sm text-text-muted">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader size="lg" text="Loading..." />
    </div>
  );
}
