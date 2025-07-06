"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"

export type ImportFormat = "tradestation" | "multicharts" | "ninjatrader"
export type MarginType = "intraday" | "overnight"

interface FileUploaderProps {
  onFilesUploaded: (files: File[], quantities: number[], format: ImportFormat, fileMarginTypes: MarginType[]) => void
  isLoading: boolean
  globalMarginType: MarginType
}

export function FileUploader({ onFilesUploaded, isLoading, globalMarginType }: FileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [quantities, setQuantities] = useState<number[]>([])
  const [fileMarginTypes, setFileMarginTypes] = useState<MarginType[]>([])
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat>("tradestation")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setSelectedFiles(filesArray)
      setQuantities(filesArray.map(() => 1)) // Default quantity is 1
      setFileMarginTypes(filesArray.map(() => globalMarginType)) // Default to global margin type
    }
  }

  const handleQuantityChange = (index: number, value: string) => {
    const newQuantities = [...quantities]
    newQuantities[index] = Number(value) || 1
    setQuantities(newQuantities)
  }

  const handleMarginTypeChange = (index: number, value: MarginType) => {
    const newMarginTypes = [...fileMarginTypes]
    newMarginTypes[index] = value
    setFileMarginTypes(newMarginTypes)
  }

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onFilesUploaded(selectedFiles, quantities, selectedFormat, fileMarginTypes)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Trading Data</CardTitle>
        <CardDescription>
          Upload CSV files with your trading strategy data to analyze portfolio performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-2">
            <Label>Select Import Format</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setSelectedFormat("tradestation")}
                variant={selectedFormat === "tradestation" ? "default" : "outline"}
                className={`flex-1 ${selectedFormat === "tradestation" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                TradeStation
              </Button>
              <Button
                type="button"
                onClick={() => setSelectedFormat("multicharts")}
                variant={selectedFormat === "multicharts" ? "default" : "outline"}
                className={`flex-1 ${selectedFormat === "multicharts" ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                MultiCharts
              </Button>
              <Button
                type="button"
                onClick={() => setSelectedFormat("ninjatrader")}
                variant={selectedFormat === "ninjatrader" ? "default" : "outline"}
                className={`flex-1 ${selectedFormat === "ninjatrader" ? "bg-red-600 hover:bg-red-700" : ""}`}
              >
                NinjaTrader
              </Button>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="files">Select Files</Label>
            <div className="flex items-center gap-2">
              <Input id="files" type="file" multiple accept=".csv" onChange={handleFileChange} className="flex-1" />
            </div>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Selected Files</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-2 border rounded-md">
                  <div className="flex-1 truncate">{file.name}</div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`quantity-${index}`} className="whitespace-nowrap">
                        Quantity:
                      </Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={quantities[index]}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        className="w-20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`margin-${index}`} className="whitespace-nowrap">
                        Margin:
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={fileMarginTypes[index] === "intraday" ? "default" : "outline"}
                          onClick={() => handleMarginTypeChange(index, "intraday")}
                          size="sm"
                          className={`py-1 h-8 ${fileMarginTypes[index] === "intraday" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        >
                          Intraday
                        </Button>
                        <Button
                          variant={fileMarginTypes[index] === "overnight" ? "default" : "outline"}
                          onClick={() => handleMarginTypeChange(index, "overnight")}
                          size="sm"
                          className={`py-1 h-8 ${fileMarginTypes[index] === "overnight" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                        >
                          Overnight
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full ${
                selectedFormat === "tradestation"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : selectedFormat === "multicharts"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Analyze Portfolio
                </span>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
