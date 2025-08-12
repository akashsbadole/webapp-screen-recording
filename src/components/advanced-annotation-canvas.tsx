"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Type, 
  MousePointer, 
  Square, 
  Circle, 
  ArrowRight, 
  Save, 
  Download,
  Trash2,
  Undo,
  Redo,
  Stamp,
  Highlighter,
  PenTool,
  Layers,
  FileText,
  Plus,
  Minus
} from "lucide-react";

export type AnnotationTool = "select" | "text" | "arrow" | "rectangle" | "circle" | "pen" | "highlighter" | "stamp";
export type Annotation = {
  id: string;
  type: AnnotationTool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  fontSize?: number;
  strokeWidth?: number;
  endX?: number;
  endY?: number;
  points?: { x: number; y: number }[];
  stampType?: string;
  layer?: number;
};

interface AdvancedAnnotationCanvasProps {
  mediaUrl: string;
  mediaType: "video" | "image";
  width?: number;
  height?: number;
  onSave?: (annotations: Annotation[]) => void;
  onExport?: (canvas: HTMLCanvasElement) => void;
  onExportPDF?: (annotations: Annotation[]) => void;
}

const STAMPS = ["⭐", "👍", "❌", "✅", "⚠️", "💡", "🎯", "🔍", "📌", "📍"];
const COLORS = [
  "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", 
  "#000000", "#ffffff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", 
  "#ffeaa7", "#dda0dd", "#98d8c8", "#f7dc6f"
];

export default function AdvancedAnnotationCanvas({
  mediaUrl,
  mediaType,
  width = 800,
  height = 600,
  onSave,
  onExport,
  onExportPDF
}: AdvancedAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ff0000");
  const [fontSize, setFontSize] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [stampType, setStampType] = useState(STAMPS[0]);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);
  const [guideMode, setGuideMode] = useState(false);
  const [guideSteps, setGuideSteps] = useState<number[]>([]);
  
  // Initialize media
  useEffect(() => {
    if (mediaType === "video") {
      const video = document.createElement('video');
      video.src = mediaUrl;
      video.crossOrigin = "anonymous";
      video.onloadedmetadata = () => {
        mediaRef.current = video;
        drawCanvas();
      };
    } else {
      const img = document.createElement('img');
      img.src = mediaUrl;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        mediaRef.current = img;
        drawCanvas();
      };
    }
  }, [mediaUrl, mediaType]);

  // Save history state
  const saveHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...annotations]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [annotations, history, historyIndex]);

  // Undo functionality
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations([...history[historyIndex - 1]]);
    }
  };

  // Redo functionality
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations([...history[historyIndex + 1]]);
    }
  };

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const media = mediaRef.current;
    if (!canvas || !media) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw media
    if (mediaType === "video") {
      const video = media as HTMLVideoElement;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      const img = media as HTMLImageElement;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Sort annotations by layer
    const sortedAnnotations = [...annotations].sort((a, b) => (a.layer || 1) - (b.layer || 1));

    // Draw annotations
    sortedAnnotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = annotation.strokeWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (annotation.type === "text" && annotation.text) {
        ctx.font = `${annotation.fontSize || 16}px Arial`;
        ctx.fillText(annotation.text, annotation.x, annotation.y);
      } else if (annotation.type === "rectangle" && annotation.width && annotation.height) {
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      } else if (annotation.type === "circle" && annotation.width && annotation.height) {
        const radius = Math.sqrt(Math.pow(annotation.width, 2) + Math.pow(annotation.height, 2)) / 2;
        ctx.beginPath();
        ctx.arc(annotation.x + annotation.width / 2, annotation.y + annotation.height / 2, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (annotation.type === "arrow" && annotation.endX && annotation.endY) {
        drawArrow(ctx, annotation.x, annotation.y, annotation.endX, annotation.endY);
      } else if (annotation.type === "pen" && annotation.points) {
        ctx.beginPath();
        annotation.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (annotation.type === "highlighter" && annotation.width && annotation.height) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = annotation.color;
        ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
        ctx.globalAlpha = 1;
      } else if (annotation.type === "stamp" && annotation.stampType) {
        ctx.font = `${annotation.fontSize || 24}px Arial`;
        ctx.fillText(annotation.stampType, annotation.x, annotation.y);
      }

      // Highlight selected annotation
      if (annotation.id === selectedAnnotation) {
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        
        if (annotation.type === "text" && annotation.text) {
          const metrics = ctx.measureText(annotation.text);
          ctx.strokeRect(annotation.x - 2, annotation.y - (annotation.fontSize || 16), metrics.width + 4, (annotation.fontSize || 16) + 4);
        } else if (annotation.type === "rectangle" && annotation.width && annotation.height) {
          ctx.strokeRect(annotation.x - 2, annotation.y - 2, annotation.width + 4, annotation.height + 4);
        } else if (annotation.type === "circle" && annotation.width && annotation.height) {
          const radius = Math.sqrt(Math.pow(annotation.width, 2) + Math.pow(annotation.height, 2)) / 2;
          ctx.beginPath();
          ctx.arc(annotation.x + annotation.width / 2, annotation.y + annotation.height / 2, radius + 2, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (annotation.type === "arrow" && annotation.endX && annotation.endY) {
          ctx.strokeRect(
            Math.min(annotation.x, annotation.endX) - 2,
            Math.min(annotation.y, annotation.endY) - 2,
            Math.abs(annotation.endX - annotation.x) + 4,
            Math.abs(annotation.endY - annotation.y) + 4
          );
        } else if (annotation.type === "pen" && annotation.points) {
          const bounds = getBounds(annotation.points);
          ctx.strokeRect(bounds.minX - 2, bounds.minY - 2, bounds.maxX - bounds.minX + 4, bounds.maxY - bounds.minY + 4);
        }
        
        ctx.setLineDash([]);
      }
    });

    // Draw current drawing
    if (isDrawing && selectedTool !== "text" && selectedTool !== "stamp") {
      ctx.strokeStyle = textColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (selectedTool === "rectangle") {
        ctx.strokeRect(
          startPos.x,
          startPos.y,
          currentPos.x - startPos.x,
          currentPos.y - startPos.y
        );
      } else if (selectedTool === "circle") {
        const radius = Math.sqrt(
          Math.pow(currentPos.x - startPos.x, 2) + 
          Math.pow(currentPos.y - startPos.y, 2)
        ) / 2;
        ctx.beginPath();
        ctx.arc(
          startPos.x + (currentPos.x - startPos.x) / 2,
          startPos.y + (currentPos.y - startPos.y) / 2,
          radius,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      } else if (selectedTool === "arrow") {
        drawArrow(ctx, startPos.x, startPos.y, currentPos.x, currentPos.y);
      } else if (selectedTool === "pen") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        penPoints.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      } else if (selectedTool === "highlighter") {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = textColor;
        ctx.fillRect(
          startPos.x,
          startPos.y,
          currentPos.x - startPos.x,
          currentPos.y - startPos.y
        );
        ctx.globalAlpha = 1;
      }
    }

    // Draw guide step numbers
    if (guideMode) {
      guideSteps.forEach((stepNumber, index) => {
        const x = 50 + (index * 100);
        const y = 50;
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stepNumber.toString(), x, y);
      });
    }
  }, [annotations, selectedAnnotation, isDrawing, startPos, currentPos, selectedTool, textColor, strokeWidth, penPoints, guideMode, guideSteps, mediaType]);

  // Helper functions
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const getBounds = (points: { x: number; y: number }[]) => {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === "select") {
      // Check if clicking on an annotation
      const clickedAnnotation = annotations.find(annotation => {
        if (annotation.type === "text" && annotation.text) {
          return x >= annotation.x && x <= annotation.x + 100 && y >= annotation.y - 16 && y <= annotation.y;
        } else if (annotation.type === "rectangle" && annotation.width && annotation.height) {
          return x >= annotation.x && x <= annotation.x + annotation.width && y >= annotation.y && y <= annotation.y + annotation.height;
        } else if (annotation.type === "circle" && annotation.width && annotation.height) {
          const centerX = annotation.x + annotation.width / 2;
          const centerY = annotation.y + annotation.height / 2;
          const radius = Math.sqrt(Math.pow(annotation.width, 2) + Math.pow(annotation.height, 2)) / 2;
          return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= radius;
        } else if (annotation.type === "arrow" && annotation.endX && annotation.endY) {
          // Simple bounding box check for arrow
          return x >= Math.min(annotation.x, annotation.endX) && x <= Math.max(annotation.x, annotation.endX) &&
                 y >= Math.min(annotation.y, annotation.endY) && y <= Math.max(annotation.y, annotation.endY);
        } else if (annotation.type === "pen" && annotation.points) {
          const bounds = getBounds(annotation.points);
          return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
        }
        return false;
      });

      setSelectedAnnotation(clickedAnnotation?.id || null);
    } else if (selectedTool === "text") {
      // Add text annotation
      const text = prompt("Enter text:", "Sample Text");
      if (text) {
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: "text",
          x,
          y,
          text,
          color: textColor,
          fontSize: fontSize,
          layer: currentLayer
        };
        setAnnotations(prev => [...prev, newAnnotation]);
        saveHistory();
      }
    } else if (selectedTool === "stamp") {
      // Add stamp annotation
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "stamp",
        x,
        y,
        color: textColor,
        fontSize: fontSize,
        stampType: stampType,
        layer: currentLayer
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (guideMode && selectedTool === "select") {
      // Add guide step number
      const stepNumber = guideSteps.length + 1;
      setGuideSteps(prev => [...prev, stepNumber]);
    } else {
      // Start drawing
      setIsDrawing(true);
      setStartPos({ x, y });
      setCurrentPos({ x, y });
      if (selectedTool === "pen") {
        setPenPoints([{ x, y }]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });
    
    if (selectedTool === "pen") {
      setPenPoints(prev => [...prev, { x, y }]);
    }
    
    drawCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (selectedTool === "rectangle") {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "rectangle",
        x: startPos.x,
        y: startPos.y,
        width: currentPos.x - startPos.x,
        height: currentPos.y - startPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "circle") {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "circle",
        x: startPos.x,
        y: startPos.y,
        width: currentPos.x - startPos.x,
        height: currentPos.y - startPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "arrow") {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "arrow",
        x: startPos.x,
        y: startPos.y,
        endX: currentPos.x,
        endY: currentPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "pen") {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "pen",
        x: startPos.x,
        y: startPos.y,
        points: [...penPoints, currentPos],
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "highlighter") {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "highlighter",
        x: startPos.x,
        y: startPos.y,
        width: currentPos.x - startPos.x,
        height: currentPos.y - startPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    }

    setPenPoints([]);
  };

  // Delete selected annotation
  const deleteSelected = () => {
    if (!selectedAnnotation) return;
    
    setAnnotations(prev => prev.filter(ann => ann.id !== selectedAnnotation));
    setSelectedAnnotation(null);
    saveHistory();
  };

  // Export annotated image
  const exportAnnotated = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `annotated-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  // Export as PDF
  const exportPDF = () => {
    if (onExportPDF) {
      onExportPDF(annotations);
    }
  };

  // Save annotations
  const saveAnnotations = () => {
    if (onSave) {
      onSave(annotations);
    }
  };

  // Update canvas when annotations change
  useEffect(() => {
    drawCanvas();
  }, [annotations, selectedAnnotation, isDrawing, startPos, currentPos, drawCanvas]);

  // Initialize history
  useEffect(() => {
    saveHistory();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Advanced Annotation Studio
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
              <Undo className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={saveAnnotations}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportAnnotated}>
              <Download className="w-4 h-4" />
            </Button>
            {onExportPDF && (
              <Button size="sm" variant="outline" onClick={exportPDF}>
                <FileText className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tool Selection */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedTool === "select" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("select")}
          >
            <MousePointer className="w-4 h-4 mr-2" />
            Select
          </Button>
          <Button
            variant={selectedTool === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("text")}
          >
            <Type className="w-4 h-4 mr-2" />
            Text
          </Button>
          <Button
            variant={selectedTool === "arrow" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("arrow")}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Arrow
          </Button>
          <Button
            variant={selectedTool === "rectangle" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("rectangle")}
          >
            <Square className="w-4 h-4 mr-2" />
            Rectangle
          </Button>
          <Button
            variant={selectedTool === "circle" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("circle")}
          >
            <Circle className="w-4 h-4 mr-2" />
            Circle
          </Button>
          <Button
            variant={selectedTool === "pen" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("pen")}
          >
            <PenTool className="w-4 h-4 mr-2" />
            Pen
          </Button>
          <Button
            variant={selectedTool === "highlighter" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("highlighter")}
          >
            <Highlighter className="w-4 h-4 mr-2" />
            Highlight
          </Button>
          <Button
            variant={selectedTool === "stamp" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("stamp")}
          >
            <Stamp className="w-4 h-4 mr-2" />
            Stamp
          </Button>
        </div>

        {/* Properties Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-1 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${
                    textColor === color ? "border-black" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setTextColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Font Size</label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setFontSize(Math.max(8, fontSize - 2))}>
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-16 text-center"
                min="8"
                max="72"
              />
              <Button size="sm" variant="outline" onClick={() => setFontSize(Math.min(72, fontSize + 2))}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stroke Width</label>
            <Input
              type="number"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full"
              min="1"
              max="20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Layer</label>
            <Input
              type="number"
              value={currentLayer}
              onChange={(e) => setCurrentLayer(Number(e.target.value))}
              className="w-full"
              min="1"
              max="10"
            />
          </div>
        </div>

        {/* Stamp Selection */}
        {selectedTool === "stamp" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Stamp Type</label>
            <div className="flex gap-2">
              {STAMPS.map((stamp) => (
                <Button
                  key={stamp}
                  variant={stampType === stamp ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStampType(stamp)}
                  className="text-lg"
                >
                  {stamp}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Guide Mode */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={guideMode}
              onChange={(e) => setGuideMode(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Guide Mode</span>
          </label>
          {guideMode && (
            <Badge variant="outline">
              {guideSteps.length} steps
            </Badge>
          )}
        </div>

        {/* Canvas Container */}
        <div className="border rounded-lg overflow-hidden">
          <div ref={containerRef} className="relative">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="border cursor-crosshair bg-white"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>

        {/* Selected Annotation Info */}
        {selectedAnnotation && (
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <Badge>Annotation Selected</Badge>
            <Button size="sm" variant="outline" onClick={deleteSelected}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}