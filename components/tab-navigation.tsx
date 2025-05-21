"use client"

import { Button } from "@/components/ui/button"
import { BarChart3, LineChart, SplitSquareVertical } from "lucide-react"

interface TabNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
      <Button
        variant={activeTab === "equity-curve" ? "default" : "ghost"}
        className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-2 ${
          activeTab === "equity-curve" ? "border-primary font-medium" : "border-transparent"
        }`}
        onClick={() => onTabChange("equity-curve")}
      >
        <LineChart className="h-4 w-4" />
        <span>Equity Curve & Statistics</span>
      </Button>

      <Button
        variant={activeTab === "returns-distribution" ? "default" : "ghost"}
        className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-2 ${
          activeTab === "returns-distribution" ? "border-primary font-medium" : "border-transparent"
        }`}
        onClick={() => onTabChange("returns-distribution")}
      >
        <BarChart3 className="h-4 w-4" />
        <span>Returns Distribution & Margins</span>
      </Button>

      <Button
        variant={activeTab === "single-strategies" ? "default" : "ghost"}
        className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-2 ${
          activeTab === "single-strategies" ? "border-primary font-medium" : "border-transparent"
        }`}
        onClick={() => onTabChange("single-strategies")}
      >
        <SplitSquareVertical className="h-4 w-4" />
        <span>Single Strategies</span>
      </Button>
    </div>
  )
}
