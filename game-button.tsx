"use client"
import type { ReactNode } from "react"

interface GameButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "success" | "warning" | "outline"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function GameButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className = "",
}: GameButtonProps) {
  const baseClasses =
    "font-bold transition-all duration-200 transform active:scale-95 shadow-lg border-2 relative overflow-hidden"

  const variantClasses = {
    primary:
      "bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-white border-green-300 shadow-green-500/50",
    secondary:
      "bg-gradient-to-b from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500 text-white border-gray-300 shadow-gray-500/50",
    success:
      "bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-white border-emerald-300 shadow-emerald-500/50",
    warning:
      "bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black border-yellow-300 shadow-yellow-500/50",
    outline:
      "bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white border-gray-500 shadow-gray-600/50",
  }

  const sizeClasses = {
    sm: "px-3 py-2 text-sm rounded-lg",
    md: "px-4 py-3 text-base rounded-xl",
    lg: "px-6 py-4 text-lg rounded-2xl",
  }

  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed transform-none shadow-none"
    : "hover:shadow-xl hover:-translate-y-0.5"

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabledClasses}
        ${className}
        flex items-center justify-center
      `}
      style={{ fontFamily: "Coiny, cursive" }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      {children}
    </button>
  )
}
