import { ButtonHTMLAttributes, ReactNode } from "react"

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function GameButton({ children, className = "", disabled, ...props }: GameButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        px-5 py-2 rounded-lg border border-cyan-400 bg-black text-cyan-200 font-mono text-base
        transition-all duration-150
        shadow-[0_0_8px_0_rgba(0,255,255,0.15)]
        hover:shadow-[0_0_16px_2px_rgba(0,255,255,0.45)]
        hover:border-cyan-300
        focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
} 