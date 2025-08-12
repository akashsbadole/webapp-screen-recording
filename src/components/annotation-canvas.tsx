"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Redo
} from "lucide-react";

export type AnnotationTool = "text" | "arrow" | "rectangle" | "circle" | "select";
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
  endX?: number;
  endY?: number;
};

interface AnnotationCanvasProps {
  mediaUrl: string;
  mediaType: "video" | "image";
  width?: number;
  height?: number;
  onSave?: (annotations: Annotation[]) => void;
  onExport?: (canvas: HTMLCanvasElement) => void;
}

export default function AnnotationCanvas({
  mediaUrl,
  mediaType,
  width = 800,
  height = 600,
  onSave,
  onExport
}: AnnotationCanvasProps) {
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
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#000000", "#ffffff"];

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

    // Draw annotations
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = 2;

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
        }
        
        ctx.setLineDash([]);
      }
    });

    // Draw current drawing
    if (isDrawing && selectedTool !== "text") {
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 2;
      
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
      }
    }
  }, [annotations, selectedAnnotation, isDrawing, startPos, currentPos, selectedTool, textColor, mediaType]);

  // Draw arrow helper
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
          fontSize: fontSize
        };
        setAnnotations(prev => [...prev, newAnnotation]);
        saveHistory();
      }
    } else {
      // Start drawing
      setIsDrawing(true);
      setStartPos({ x, y });
      setCurrentPos({ x, y });
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
        color: textColor
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
        color: textColor
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
        color: textColor
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    }
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
          <span>Annotation Tools</span>
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
        </div>

        {/* Color Selection */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Color:</span>
          <div className="flex gap-1">
            {colors.map((color) => (
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

        {/* Font Size for Text */}
        {selectedTool === "text" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Font Size:</span>
            <Input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20"
              min="8"
              max="72"
            />
          </div>
        )}

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