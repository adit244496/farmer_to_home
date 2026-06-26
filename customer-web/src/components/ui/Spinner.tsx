import clsx from 'clsx'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'h-6 w-6 animate-spin rounded-full border-2 border-primary-700 border-t-transparent',
        className
      )}
    />
  )
}
