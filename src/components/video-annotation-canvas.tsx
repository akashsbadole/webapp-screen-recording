"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Scissors,
  Clock,
  Tag,
  Plus
} from "lucide-react";

export type VideoAnnotationTool = "select" | "text" | "arrow" | "rectangle" | "circle" | "pen" | "highlighter" | "stamp";
export type VideoAnnotation = {
  id: string;
  type: VideoAnnotationTool;
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
  timestamp: number; // Video timestamp in seconds
  duration?: number; // How long the annotation should be visible (optional)
  title?: string; // Optional title for the annotation
  description?: string; // Optional description
};

interface VideoAnnotationCanvasProps {
  videoUrl: string;
  width?: number;
  height?: number;
  onSave?: (annotations: VideoAnnotation[]) => void;
  onExport?: (canvas: HTMLCanvasElement) => void;
  onExportPDF?: (annotations: VideoAnnotation[]) => void;
}

const STAMPS = ["⭐", "👍", "❌", "✅", "⚠️", "💡", "🎯", "🔍", "📌", "📍"];
const COLORS = [
  "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", 
  "#000000", "#ffffff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", 
  "#ffeaa7", "#dda0dd", "#98d8c8", "#f7dc6f"
];

export default function VideoAnnotationCanvas({
  videoUrl,
  width = 800,
  height = 600,
  onSave,
  onExport,
  onExportPDF
}: VideoAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedTool, setSelectedTool] = useState<VideoAnnotationTool>("select");
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ff0000");
  const [fontSize, setFontSize] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [history, setHistory] = useState<VideoAnnotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [stampType, setStampType] = useState(STAMPS[0]);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);
  
  // Video-specific states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [newAnnotationTitle, setNewAnnotationTitle] = useState("");
  const [newAnnotationDescription, setNewAnnotationDescription] = useState("");
  const [newAnnotationDuration, setNewAnnotationDuration] = useState(5);
  
  // Initialize video
  useEffect(() => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => {
      videoRef.current = video;
      setDuration(video.duration);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleVideoEnded);
      drawCanvas();
    };
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleVideoEnded);
    };
  }, [videoUrl]);

  // Handle video time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      drawCanvas();
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

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
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get annotations that should be visible at current time
    const visibleAnnotations = annotations.filter(annotation => {
      const annotationStart = annotation.timestamp;
      const annotationEnd = annotation.duration ? annotationStart + annotation.duration : annotationStart;
      return currentTime >= annotationStart && currentTime <= annotationEnd;
    });

    // Sort annotations by layer
    const sortedAnnotations = [...visibleAnnotations].sort((a, b) => (a.layer || 1) - (b.layer || 1));

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

    // Draw timestamp indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 120, 30);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(formatTime(currentTime), 20, 30);
  }, [annotations, selectedAnnotation, isDrawing, startPos, currentPos, selectedTool, textColor, strokeWidth, penPoints, currentTime]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Video controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
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
      setShowAnnotationForm(true);
      setStartPos({ x, y });
    } else if (selectedTool === "stamp") {
      const newAnnotation: VideoAnnotation = {
        id: Date.now().toString(),
        type: "stamp",
        x,
        y,
        color: textColor,
        fontSize: fontSize,
        stampType: stampType,
        layer: currentLayer,
        timestamp: currentTime,
        duration: newAnnotationDuration
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
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
      const newAnnotation: VideoAnnotation = {
        id: Date.now().toString(),
        type: "rectangle",
        x: startPos.x,
        y: startPos.y,
        width: currentPos.x - startPos.x,
        height: currentPos.y - startPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer,
        timestamp: currentTime,
        duration: newAnnotationDuration
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "circle") {
      const newAnnotation: VideoAnnotation = {
        id: Date.now().toString(),
        type: "circle",
        x: startPos.x,
        y: startPos.y,
        width: currentPos.x - startPos.x,
        height: currentPos.y - startPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer,
        timestamp: currentTime,
        duration: newAnnotationDuration
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "arrow") {
      const newAnnotation: VideoAnnotation = {
        id: Date.now().toString(),
        type: "arrow",
        x: startPos.x,
        y: startPos.y,
        endX: currentPos.x,
        endY: currentPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer,
        timestamp: currentTime,
        duration: newAnnotationDuration
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "pen") {
      const newAnnotation: VideoAnnotation = {
        id: Date.now().toString(),
        type: "pen",
        x: startPos.x,
        y: startPos.y,
        points: [...penPoints, currentPos],
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer,
        timestamp: currentTime,
        duration: newAnnotationDuration
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    } else if (selectedTool === "highlighter") {
      const newAnnotation: VideoAnnotation = {
        id: Date.now().toString(),
        type: "highlighter",
        x: startPos.x,
        y: startPos.y,
        width: currentPos.x - startPos.x,
        height: currentPos.y - startPos.y,
        color: textColor,
        strokeWidth: strokeWidth,
        layer: currentLayer,
        timestamp: currentTime,
        duration: newAnnotationDuration
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      saveHistory();
    }

    setPenPoints([]);
  };

  // Add text annotation with form
  const addTextAnnotation = () => {
    if (!textInput.trim()) return;

    const newAnnotation: VideoAnnotation = {
      id: Date.now().toString(),
      type: "text",
      x: startPos.x,
      y: startPos.y,
      text: textInput,
      color: textColor,
      fontSize: fontSize,
      layer: currentLayer,
      timestamp: currentTime,
      duration: newAnnotationDuration,
      title: newAnnotationTitle,
      description: newAnnotationDescription
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    saveHistory();
    
    // Reset form
    setTextInput("");
    setNewAnnotationTitle("");
    setNewAnnotationDescription("");
    setShowAnnotationForm(false);
  };

  // Delete selected annotation
  const deleteSelected = () => {
    if (!selectedAnnotation) return;
    
    setAnnotations(prev => prev.filter(ann => ann.id !== selectedAnnotation));
    setSelectedAnnotation(null);
    saveHistory();
  };

  // Export annotated frame
  const exportAnnotatedFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-annotation-${formatTime(currentTime)}.png`;
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

  // Jump to annotation timestamp
  const jumpToAnnotation = (annotation: VideoAnnotation) => {
    seekTo(annotation.timestamp);
    setSelectedAnnotation(annotation.id);
  };

  return (
    <div className="space-y-4">
      {/* Video Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Video Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={skipBackward}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={togglePlayPause}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={skipForward}>
              <SkipForward className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-2 ml-4">
              <Volume2 className="w-4 h-4" />
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={1}
                min={0}
                step={0.1}
                className="w-20"
              />
            </div>

            <Select value={playbackRate.toString()} onValueChange={(value) => handlePlaybackRateChange(parseFloat(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Annotation Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Video Annotation Canvas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Annotation Tools */}
            <div className="flex flex-wrap gap-2 p-4 bg-muted rounded-lg">
              <Button
                size="sm"
                variant={selectedTool === "select" ? "default" : "outline"}
                onClick={() => setSelectedTool("select")}
              >
                <MousePointer className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "text" ? "default" : "outline"}
                onClick={() => setSelectedTool("text")}
              >
                <Type className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "arrow" ? "default" : "outline"}
                onClick={() => setSelectedTool("arrow")}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "rectangle" ? "default" : "outline"}
                onClick={() => setSelectedTool("rectangle")}
              >
                <Square className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "circle" ? "default" : "outline"}
                onClick={() => setSelectedTool("circle")}
              >
                <Circle className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "pen" ? "default" : "outline"}
                onClick={() => setSelectedTool("pen")}
              >
                <PenTool className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "highlighter" ? "default" : "outline"}
                onClick={() => setSelectedTool("highlighter")}
              >
                <Highlighter className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "stamp" ? "default" : "outline"}
                onClick={() => setSelectedTool("stamp")}
              >
                <Stamp className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2 ml-4">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 border rounded cursor-pointer"
                />
                <Input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value) || 16)}
                  className="w-16"
                  min="8"
                  max="72"
                />
                <Input
                  type="number"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value) || 2)}
                  className="w-16"
                  min="1"
                  max="20"
                />
              </div>

              {selectedTool === "stamp" && (
                <Select value={stampType} onValueChange={setStampType}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAMPS.map(stamp => (
                      <SelectItem key={stamp} value={stamp}>{stamp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2 ml-4">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Duration:</span>
                <Input
                  type="number"
                  value={newAnnotationDuration}
                  onChange={(e) => setNewAnnotationDuration(parseInt(e.target.value) || 5)}
                  className="w-16"
                  min="1"
                  max="60"
                />
                <span className="text-sm">s</span>
              </div>
            </div>

            {/* Canvas */}
            <div className="relative border rounded-lg overflow-hidden" ref={containerRef}>
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="cursor-crosshair bg-black"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={undo}>
                <Undo className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button size="sm" variant="outline" onClick={redo}>
                <Redo className="w-4 h-4 mr-1" />
                Redo
              </Button>
              <Button size="sm" variant="outline" onClick={deleteSelected} disabled={!selectedAnnotation}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <Button size="sm" variant="outline" onClick={exportAnnotatedFrame}>
                <Download className="w-4 h-4 mr-1" />
                Export Frame
              </Button>
              <Button size="sm" variant="outline" onClick={exportPDF}>
                <FileText className="w-4 h-4 mr-1" />
                Export PDF
              </Button>
              <Button size="sm" onClick={saveAnnotations}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Annotation Form Modal */}
      {showAnnotationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Add Text Annotation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Annotation title (optional)"
                value={newAnnotationTitle}
                onChange={(e) => setNewAnnotationTitle(e.target.value)}
              />
              <Textarea
                placeholder="Enter your text annotation..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={3}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newAnnotationDescription}
                onChange={(e) => setNewAnnotationDescription(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addTextAnnotation} disabled={!textInput.trim()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Annotation
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAnnotationForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Annotations Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Annotations Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {annotations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No annotations yet. Start adding annotations to see them here.
              </p>
            ) : (
              annotations
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((annotation) => (
                  <div
                    key={annotation.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAnnotation === annotation.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => jumpToAnnotation(annotation)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{formatTime(annotation.timestamp)}</Badge>
                        <Badge variant="secondary">{annotation.type}</Badge>
                        {annotation.title && (
                          <span className="font-medium">{annotation.title}</span>
                        )}
                      </div>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: annotation.color }}
                      />
                    </div>
                    {annotation.text && (
                      <p className="text-sm text-muted-foreground mt-1">{annotation.text}</p>
                    )}
                    {annotation.description && (
                      <p className="text-xs text-muted-foreground mt-1">{annotation.description}</p>
                    )}
                    {annotation.duration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Duration: {annotation.duration}s
                      </p>
                    )}
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}