import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface GameButtonProps extends ButtonProps {
  children: ReactNode
  variant?: "default" | "outline" | "ghost"
}

export function GameButton({ children, className, variant = "default", ...props }: GameButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn(
        "h-12 text-lg font-semibold transition-all duration-200",
        variant === "default" && "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
        variant === "outline" && "border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white",
        variant === "ghost" && "text-purple-600 hover:bg-purple-600/10",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
} 