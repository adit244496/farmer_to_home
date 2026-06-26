import clsx from 'clsx'
import { Spinner } from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-600': variant === 'primary',
          'border border-primary-700 text-primary-700 hover:bg-primary-50 focus:ring-primary-600': variant === 'outline',
          'text-gray-700 hover:bg-gray-100 focus:ring-gray-300': variant === 'ghost',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2.5 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
          'w-full': fullWidth,
        },
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4 border-white border-t-transparent" />}
      {children}
    </button>
  )
}
