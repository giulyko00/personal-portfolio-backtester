"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon } from "lucide-react"

interface DateRangeFilterProps {
  startDate: string
  endDate: string
  onApplyFilter: (startDate: string, endDate: string) => void
}

export function DateRangeFilter({ startDate, endDate, onApplyFilter }: DateRangeFilterProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)

  const handleApplyFilter = () => {
    onApplyFilter(localStartDate, localEndDate)
  }

  return (
    <Card className="bg-gray-100 dark:bg-gray-800 border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start-date">Start Date (YYYY-MM-DD)</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="start-date"
                type="text"
                placeholder="YYYY-MM-DD"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end-date">End Date (YYYY-MM-DD)</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="end-date"
                type="text"
                placeholder="YYYY-MM-DD"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Button onClick={handleApplyFilter} className="bg-blue-600 hover:bg-blue-700">
            Apply Filter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
