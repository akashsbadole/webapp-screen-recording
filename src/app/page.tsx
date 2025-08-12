"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Video,
  Monitor,
  Image,
  Download,
  Trash2,
  Edit,
  Play,
  Pause,
  Square,
  Fingerprint,
  Zap,
  Shield,
  Clock,
  MousePointer,
  FileText,
  Layers,
  Cloud,
  Scissors,
  Settings,
  Camera,
  Mic,
  HelpCircle,
  Chrome,
  ExternalLink,
  Globe,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AnnotationCanvas from "@/components/annotation-canvas";
import AdvancedAnnotationCanvas from "@/components/advanced-annotation-canvas";
import VideoAnnotationCanvas from "@/components/video-annotation-canvas";
import { createGifFromVideo } from "@/lib/gif-creator";
import { generateAnnotationPDF } from "@/lib/pdf-generator";

interface MediaFile {
  id: string;
  type: "video" | "screen" | "gif" | "image";
  url: string;
  thumbnailUrl?: string;
  timestamp: number;
  duration?: number;
  size?: number;
  annotations?: any[]; // Can be regular annotations or video annotations with timestamps
  guideSteps?: GuideStep[];
  mouseEvents?: MouseEvent[];
}

interface GuideStep {
  id: string;
  number: number;
  title: string;
  description: string;
  timestamp: number;
  screenshot?: string;
  annotations?: any[];
}

interface MouseEvent {
  type: "click" | "move";
  x: number;
  y: number;
  timestamp: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("video");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isCreatingGif, setIsCreatingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [cameraPermission, setCameraPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [microphonePermission, setMicrophonePermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [captureMouse, setCaptureMouse] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [outputFormat, setOutputFormat] = useState("webm");
  const [videoQuality, setVideoQuality] = useState("high");

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseEventsRef = useRef<MouseEvent[]>([]);

  const { toast } = useToast();

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Update overall permission status when individual permissions change
  useEffect(() => {
    if (cameraPermission === "granted" || microphonePermission === "granted") {
      setPermissionStatus("granted");
    } else if (
      cameraPermission === "denied" &&
      microphonePermission === "denied"
    ) {
      setPermissionStatus("denied");
    } else {
      setPermissionStatus("prompt");
    }
  }, [cameraPermission, microphonePermission]);

  // Mouse tracking setup
  useEffect(() => {
    if (captureMouse && isRecording) {
      const handleMouseMove = (e: MouseEvent) => {
        mouseEventsRef.current.push({
          type: "move",
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now(),
        });
      };

      const handleClick = (e: MouseEvent) => {
        mouseEventsRef.current.push({
          type: "click",
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now(),
        });
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("click", handleClick);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("click", handleClick);
      };
    }
  }, [captureMouse, isRecording]);

  const checkPermissions = async () => {
    try {
      // Check camera permission
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraPermission("granted");
      } catch (error) {
        setCameraPermission("denied");
      }

      // Check microphone permission
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        micStream.getTracks().forEach((track) => track.stop());
        setMicrophonePermission("granted");
      } catch (error) {
        setMicrophonePermission("denied");
      }

      // Set overall permission status
      if (
        cameraPermission === "granted" ||
        microphonePermission === "granted"
      ) {
        setPermissionStatus("granted");
      } else if (
        cameraPermission === "denied" &&
        microphonePermission === "denied"
      ) {
        setPermissionStatus("denied");
        setErrorMessage(
          "Camera and microphone access are required for recording features"
        );
      } else {
        setPermissionStatus("prompt");
        setShowPermissionModal(true);
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      setPermissionStatus("denied");
      setErrorMessage(
        "Unable to check permissions. Please check your browser settings."
      );
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus("granted");
      setCameraPermission("granted");
      setMicrophonePermission("granted");
      setErrorMessage("");
      setShowPermissionModal(false);

      toast({
        title: "Permissions granted",
        description: "You can now start recording",
      });
    } catch (error) {
      console.error("Permission request failed:", error);
      setPermissionStatus("denied");
      setErrorMessage(
        "Please allow camera and microphone access to use recording features"
      );
      setShowPermissionModal(true);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission("granted");

      // Update overall permission status
      if (
        microphonePermission === "granted" ||
        cameraPermission === "granted"
      ) {
        setPermissionStatus("granted");
      }

      toast({
        title: "Camera permission granted",
        description: "Camera access has been enabled",
      });
    } catch (error) {
      console.error("Camera permission request failed:", error);
      setCameraPermission("denied");
      toast({
        title: "Camera permission denied",
        description: "Please allow camera access in your browser settings",
        variant: "destructive",
      });
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission("granted");

      // Update overall permission status
      if (
        microphonePermission === "granted" ||
        cameraPermission === "granted"
      ) {
        setPermissionStatus("granted");
      }

      toast({
        title: "Microphone permission granted",
        description: "Microphone access has been enabled",
      });
    } catch (error) {
      console.error("Microphone permission request failed:", error);
      setMicrophonePermission("denied");
      toast({
        title: "Microphone permission denied",
        description: "Please allow microphone access in your browser settings",
        variant: "destructive",
      });
    }
  };

  const openBrowserSettings = () => {
    // Guide user to browser settings
    const isChrome =
      /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari =
      /Safari/.test(navigator.userAgent) &&
      /Apple Computer/.test(navigator.vendor);

    let message = "To enable permissions:\n\n";

    if (isChrome) {
      message += "1. Click the lock icon 📋 in the address bar\n";
      message += "2. Select 'Site settings'\n";
      message += "3. Enable Camera and/or Microphone\n";
      message += "4. Refresh the page";
    } else if (isFirefox) {
      message += "1. Click the lock icon 🔒 in the address bar\n";
      message += "2. Select 'More information'\n";
      message += "3. Click 'Permissions'\n";
      message += "4. Enable Camera and/or Microphone\n";
      message += "5. Refresh the page";
    } else if (isSafari) {
      message += "1. Go to Safari > Preferences > Websites\n";
      message += "2. Select Camera and/or Microphone\n";
      message += "3. Find this site and allow access\n";
      message += "4. Refresh the page";
    } else {
      message +=
        "1. Look for a permission icon in your browser's address bar\n";
      message += "2. Click it to manage site permissions\n";
      message += "3. Enable Camera and/or Microphone\n";
      message += "4. Refresh the page";
    }

    alert(message);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Auto-delete files after 1 hour
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const updatedFiles = mediaFiles.filter((file) => {
        const isExpired = now - file.timestamp > 60 * 60 * 1000; // 1 hour
        if (isExpired) {
          URL.revokeObjectURL(file.url);
        }
        return !isExpired;
      });

      if (updatedFiles.length !== mediaFiles.length) {
        setMediaFiles(updatedFiles);
        toast({
          title: "Auto-cleanup",
          description: "Old recordings have been deleted",
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [mediaFiles, toast]);

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const captureScreenAsImage = async () => {
    if (cameraPermission !== "granted") {
      setShowPermissionModal(true);
      toast({
        title: "Camera permission required",
        description: "Please enable camera access to capture screen",
        variant: "destructive",
      });
      return;
    }

    try {
      setErrorMessage("");

      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // Create video element to capture frame
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      video.onloadedmetadata = () => {
        // Create canvas to capture frame
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to blob and create URL
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

              const newFile: MediaFile = {
                id: Date.now().toString(),
                type: "image",
                url,
                thumbnailUrl,
                timestamp: Date.now(),
                size: blob.size,
              };

              setMediaFiles((prev) => [newFile, ...prev]);

              toast({
                title: "Screen captured",
                description: "Screen capture saved as image",
              });
            }
          }, "image/png");
        }

        // Stop the stream
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (error) {
      console.error("Error capturing screen:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to capture screen";
      setErrorMessage(errorMsg);
      toast({
        title: "Screen capture failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const startRecording = async (type: "video" | "screen" | "gif") => {
    // Check if required permissions are available
    const needsCamera = type === "video" || type === "gif";
    const needsMicrophone = type !== "gif"; // GIF doesn't need audio

    if (needsCamera && cameraPermission !== "granted") {
      setShowPermissionModal(true);
      toast({
        title: "Camera permission required",
        description: "Please enable camera access to start recording",
        variant: "destructive",
      });
      return;
    }

    if (needsMicrophone && microphonePermission !== "granted") {
      setShowPermissionModal(true);
      toast({
        title: "Microphone permission required",
        description: "Please enable microphone access to start recording",
        variant: "destructive",
      });
      return;
    }

    try {
      setErrorMessage("");
      mouseEventsRef.current = [];

      let stream: MediaStream;
      let videoConstraints: MediaTrackConstraints;
      let audioConstraints: MediaTrackConstraints | boolean;

      // Set quality-based constraints
      switch (videoQuality) {
        case "high":
          videoConstraints = {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
          };
          audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          };
          break;
        case "medium":
          videoConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          };
          audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
          };
          break;
        case "low":
          videoConstraints = {
            width: { ideal: 854 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 },
          };
          audioConstraints = false;
          break;
        default:
          videoConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };
          audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
          };
      }

      if (type === "video") {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });
      } else if (type === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: videoConstraints,
          audio: audioConstraints !== false ? audioConstraints : false,
        });
      } else {
        // For GIF, we'll use video but convert later
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 800 },
            height: { ideal: 600 },
            frameRate: { ideal: 15 },
          },
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current
          .play()
          .catch((e) => console.error("Video play failed:", e));
      }

      // Set MIME type based on output format
      let mimeType: string;
      switch (outputFormat) {
        case "mp4":
          mimeType = "video/mp4";
          break;
        case "webm":
        default:
          mimeType = "video/webm;codecs=vp9,opus";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/webm;codecs=vp8,opus";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = "video/webm";
            }
          }
          break;
      }

      const options = {
        mimeType,
        videoBitsPerSecond:
          type === "gif"
            ? 1500000
            : videoQuality === "high"
            ? 8000000
            : videoQuality === "medium"
            ? 4000000
            : 2000000,
        audioBitsPerSecond: audioConstraints !== false ? 128000 : 0,
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType,
        });
        const url = URL.createObjectURL(blob);

        // Create a video element to extract the first frame as thumbnail
        const video = document.createElement("video");
        video.src = url;
        video.onloadeddata = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

            const newFile: MediaFile = {
              id: Date.now().toString(),
              type,
              url,
              thumbnailUrl,
              timestamp: Date.now(),
              duration: recordingTime,
              size: blob.size,
              mouseEvents: captureMouse
                ? [...mouseEventsRef.current]
                : undefined,
            };

            setMediaFiles((prev) => [newFile, ...prev]);

            toast({
              title: "Recording saved",
              description: `${
                type.charAt(0).toUpperCase() + type.slice(1)
              } recording completed successfully`,
            });
          }
        };

        // Clean up video element
        video.onended = () => {
          URL.revokeObjectURL(video.src);
        };
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setErrorMessage("Recording failed. Please try again.");
        stopRecording();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      startTimer();

      toast({
        title: "Recording started",
        description: `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } recording in progress`,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to start recording";
      setErrorMessage(errorMsg);
      toast({
        title: "Recording failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
    stopTimer();
    mouseEventsRef.current = [];
  };

  const pauseRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const deleteFile = (id: string) => {
    const fileToDelete = mediaFiles.find((file) => file.id === id);
    if (fileToDelete) {
      URL.revokeObjectURL(fileToDelete.url);
    }

    setMediaFiles((prev) => prev.filter((file) => file.id !== id));

    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }

    toast({
      title: "File deleted",
      description: "Recording has been removed",
    });
  };

  const downloadFile = (file: MediaFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    const extension = outputFormat === "mp4" ? "mp4" : "webm";
    a.download = `${file.type}-${file.id}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Download started",
      description: "Your file is being downloaded",
    });
  };

  const startAnnotation = (file: MediaFile) => {
    setSelectedFile(file);
    setIsAnnotating(true);
  };

  const createGif = async (file: MediaFile) => {
    if (file.type === "gif") return; // Already a GIF

    setIsCreatingGif(true);
    setGifProgress(0);

    try {
      const gifBlob = await createGifFromVideo(
        file.url,
        { width: 400, height: 300, quality: 10, delay: 200 },
        (progress) => setGifProgress(progress)
      );

      const gifUrl = URL.createObjectURL(gifBlob);

      const gifFile: MediaFile = {
        id: Date.now().toString(),
        type: "gif",
        url: gifUrl,
        timestamp: Date.now(),
        duration: file.duration,
        size: gifBlob.size,
      };

      setMediaFiles((prev) => [gifFile, ...prev]);

      toast({
        title: "GIF Created",
        description: "Your video has been converted to GIF",
      });
    } catch (error) {
      console.error("Error creating GIF:", error);
      toast({
        title: "Error",
        description: "Failed to create GIF",
        variant: "destructive",
      });
    } finally {
      setIsCreatingGif(false);
      setGifProgress(0);
    }
  };

  const saveAnnotations = (annotations: any[]) => {
    if (selectedFile) {
      setMediaFiles((prev) =>
        prev.map((file) =>
          file.id === selectedFile.id ? { ...file, annotations } : file
        )
      );

      toast({
        title: "Annotations Saved",
        description: "Your annotations have been saved",
      });
    }
  };

  const exportToPDF = async (annotations: any[]) => {
    if (selectedFile) {
      try {
        const pdfBlob = await generateAnnotationPDF(
          selectedFile.url,
          annotations,
          {
            title: `${
              selectedFile.type.charAt(0).toUpperCase() +
              selectedFile.type.slice(1)
            } Recording Analysis`,
            author: "Screen Recording Web App",
            includeAnnotations: true,
            includeSteps: true,
          }
        );

        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording-analysis-${selectedFile.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: "PDF Exported",
          description: "Your analysis has been exported to PDF",
        });
      } catch (error) {
        console.error("PDF export failed:", error);
        toast({
          title: "Export Failed",
          description: "Failed to generate PDF",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto p-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Video className="w-10 h-10 text-blue-900" />
              <div className="absolute -top-1 -right-1">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Screen Recording Web App
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional video recording, screen capture, and GIF creation with
            powerful annotation tools
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Auto-cleanup after 1 hour</span>
            </div>
          </div>
        </div>

        {/* Permission Management */}
        {(permissionStatus === "denied" ||
          permissionStatus === "prompt" ||
          showPermissionModal) && (
          <div className="space-y-4">
            {/* Permission Status Alert */}
            <Alert
              className={`border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 ${
                permissionStatus === "denied"
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                  : ""
              }`}
            >
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    {permissionStatus === "denied"
                      ? "Camera and microphone access are required for recording features."
                      : "Permissions needed to enable recording features."}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>
                          Camera:{" "}
                          {cameraPermission === "granted"
                            ? "✅ Granted"
                            : cameraPermission === "denied"
                            ? "❌ Denied"
                            : "⏳ Pending"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        <span>
                          Microphone:{" "}
                          {microphonePermission === "granted"
                            ? "✅ Granted"
                            : microphonePermission === "denied"
                            ? "❌ Denied"
                            : "⏳ Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Dialog
                    open={showPermissionModal}
                    onOpenChange={setShowPermissionModal}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`ml-2 ${
                          permissionStatus === "denied"
                            ? "border-red-300 text-red-700 hover:bg-red-100"
                            : "border-blue-300 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        Manage Permissions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Camera & Microphone Permissions
                        </DialogTitle>
                        <DialogDescription>
                          Enable camera and microphone access to use recording
                          features. You can enable individual permissions based
                          on your needs.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6">
                        {/* Camera Permission */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Camera className="w-4 h-4" />
                              <Label
                                htmlFor="camera-permission"
                                className="text-sm font-medium"
                              >
                                Camera Access
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  cameraPermission === "granted"
                                    ? "default"
                                    : cameraPermission === "denied"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {cameraPermission === "granted"
                                  ? "Granted"
                                  : cameraPermission === "denied"
                                  ? "Denied"
                                  : "Not Set"}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Required for video recording and screen capture with
                            camera overlay.
                          </p>
                          {cameraPermission !== "granted" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={requestCameraPermission}
                                className="flex-1"
                              >
                                Enable Camera
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={openBrowserSettings}
                                className="text-xs"
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Settings
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Microphone Permission */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mic className="w-4 h-4" />
                              <Label
                                htmlFor="microphone-permission"
                                className="text-sm font-medium"
                              >
                                Microphone Access
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  microphonePermission === "granted"
                                    ? "default"
                                    : microphonePermission === "denied"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {microphonePermission === "granted"
                                  ? "Granted"
                                  : microphonePermission === "denied"
                                  ? "Denied"
                                  : "Not Set"}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Required for audio recording in videos and screen
                            captures.
                          </p>
                          {microphonePermission !== "granted" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={requestMicrophonePermission}
                                className="flex-1"
                              >
                                Enable Microphone
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={openBrowserSettings}
                                className="text-xs"
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Settings
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Quick Actions
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={requestPermissions}
                              className="text-xs"
                            >
                              Enable All
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowPermissionModal(false);
                                checkPermissions();
                              }}
                              className="text-xs"
                            >
                              Check Status
                            </Button>
                          </div>
                        </div>

                        {/* Browser Instructions */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Browser Instructions
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-2">
                            <div className="flex items-center gap-2">
                              <Chrome className="w-3 h-3" />
                              <span>
                                Chrome: Click 📋 in address bar → Site settings
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="w-3 h-3" />
                              <span>
                                Firefox: Click 🔒 in address bar → Permissions
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Search className="w-3 h-3" />
                              <span>
                                Safari: Safari → Preferences → Websites
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={openBrowserSettings}
                            className="w-full text-xs"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open Browser Settings Guide
                          </Button>
                        </div>

                        {/* Permission Requirements */}
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Permission Requirements
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              • <strong>Video Recording:</strong> Camera
                              required
                            </div>
                            <div>
                              • <strong>Screen Capture:</strong> Camera optional
                              (for overlay)
                            </div>
                            <div>
                              • <strong>Audio Recording:</strong> Microphone
                              required
                            </div>
                            <div>
                              • <strong>GIF Creation:</strong> Camera required
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && permissionStatus === "granted" && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 h-12 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <TabsTrigger
              value="video"
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg transition-all"
            >
              <Video className="w-4 h-4" />
              <span className="font-medium">Video</span>
            </TabsTrigger>
            <TabsTrigger
              value="screen"
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg transition-all"
            >
              <Monitor className="w-4 h-4" />
              <span className="font-medium">Screen</span>
            </TabsTrigger>
            <TabsTrigger
              value="image"
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg transition-all"
            >
              <Monitor className="w-4 h-4" />
              <span className="font-medium">Image</span>
            </TabsTrigger>
            <TabsTrigger
              value="gif"
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg transition-all"
            >
              <Image className="w-4 h-4" alt="gif" />
              <span className="font-medium">GIF</span>
            </TabsTrigger>
          </TabsList>

          {/* Video Tab Content */}
          <TabsContent value="video" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recording Preview */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Live Preview
                    </span>
                    {isRecording && (
                      <Badge
                        variant="destructive"
                        className="animate-pulse px-3 py-1"
                      >
                        <Square className="w-3 h-3 mr-1" />
                        REC {formatTime(recordingTime)}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                    {streamRef.current ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-sm">Preview will appear here</p>
                        <p className="text-xs opacity-60">
                          Click "Start Recording" to begin
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-center">
                    {!isRecording ? (
                      <Button
                        onClick={() => startRecording("video")}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        disabled={permissionStatus !== "granted"}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={stopRecording}
                          variant="destructive"
                          className="font-medium px-6 py-3 rounded-xl"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop
                        </Button>
                        {isPaused ? (
                          <Button
                            onClick={resumeRecording}
                            className="font-medium px-6 py-3 rounded-xl"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            onClick={pauseRecording}
                            className="font-medium px-6 py-3 rounded-xl"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Advanced Options */}
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setShowAdvancedOptions(!showAdvancedOptions)
                      }
                      className="w-full"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {showAdvancedOptions ? "Hide" : "Show"} Advanced Options
                    </Button>

                    {showAdvancedOptions && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Video Quality
                          </label>
                          <select
                            value={videoQuality}
                            onChange={(e) => setVideoQuality(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                          >
                            <option value="high">High (1080p 60fps)</option>
                            <option value="medium">Medium (720p 30fps)</option>
                            <option value="low">Low (480p 15fps)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Output Format
                          </label>
                          <select
                            value={outputFormat}
                            onChange={(e) => setOutputFormat(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                          >
                            <option value="webm">WebM</option>
                            <option value="mp4">MP4</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={captureMouse}
                              onChange={(e) =>
                                setCaptureMouse(e.target.checked)
                              }
                              className="rounded"
                            />
                            <MousePointer className="w-4 h-4" />
                            Capture Mouse Events
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {isRecording && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Recording Progress</span>
                        <span className="font-mono">
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                      <Progress
                        value={(recordingTime % 60) * 1.67}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Media Library */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Media Library
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {mediaFiles.filter((f) => f.type === "video").length}{" "}
                      files
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {mediaFiles.filter((f) => f.type === "video").length ===
                    0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                          <Video className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-muted-foreground">
                          No video recordings yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Start recording to see your files here
                        </p>
                      </div>
                    ) : (
                      mediaFiles
                        .filter((file) => file.type === "video")
                        .map((file) => (
                          <div
                            key={file.id}
                            className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all cursor-pointer"
                            onClick={() => setSelectedFile(file)}
                          >
                            <div className="relative">
                              {file.thumbnailUrl ? (
                                <img
                                  src={file.thumbnailUrl}
                                  alt="Video thumbnail"
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                                  <Video className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium capitalize text-sm truncate">
                                  {file.type} Recording
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {file.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {file.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(file.duration)}
                                  </span>
                                )}
                                {file.size && (
                                  <span>• {formatBytes(file.size)}</span>
                                )}
                                {file.mouseEvents &&
                                  file.mouseEvents.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <MousePointer className="w-3 h-3" />
                                      {file.mouseEvents.length} events
                                    </span>
                                  )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(file.timestamp).toLocaleTimeString()}
                              </p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => startAnnotation(file)}
                                title="Annotate"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => createGif(file)}
                                disabled={isCreatingGif}
                                title="Create GIF"
                              >
                                <Image className="w-4 h-4" alt="" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => downloadFile(file)}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => deleteFile(file.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Screen Tab Content */}
          <TabsContent value="screen" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recording Preview */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Screen Recording
                    </span>
                    {isRecording && (
                      <Badge
                        variant="destructive"
                        className="animate-pulse px-3 py-1"
                      >
                        <Square className="w-3 h-3 mr-1" />
                        REC {formatTime(recordingTime)}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                    {streamRef.current ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Monitor className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-sm">Preview will appear here</p>
                        <p className="text-xs opacity-60">
                          Click "Start Recording" to begin
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-center">
                    {!isRecording ? (
                      <Button
                        onClick={() => startRecording("screen")}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        disabled={permissionStatus !== "granted"}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={stopRecording}
                          variant="destructive"
                          className="font-medium px-6 py-3 rounded-xl"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop
                        </Button>
                        {isPaused ? (
                          <Button
                            onClick={resumeRecording}
                            className="font-medium px-6 py-3 rounded-xl"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            onClick={pauseRecording}
                            className="font-medium px-6 py-3 rounded-xl"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Advanced Options */}
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setShowAdvancedOptions(!showAdvancedOptions)
                      }
                      className="w-full"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {showAdvancedOptions ? "Hide" : "Show"} Advanced Options
                    </Button>

                    {showAdvancedOptions && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Video Quality
                          </label>
                          <select
                            value={videoQuality}
                            onChange={(e) => setVideoQuality(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                          >
                            <option value="high">High (1080p 60fps)</option>
                            <option value="medium">Medium (720p 30fps)</option>
                            <option value="low">Low (480p 15fps)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Output Format
                          </label>
                          <select
                            value={outputFormat}
                            onChange={(e) => setOutputFormat(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                          >
                            <option value="webm">WebM</option>
                            <option value="mp4">MP4</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={captureMouse}
                              onChange={(e) =>
                                setCaptureMouse(e.target.checked)
                              }
                              className="rounded"
                            />
                            <MousePointer className="w-4 h-4" />
                            Capture Mouse Events
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {isRecording && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Recording Progress</span>
                        <span className="font-mono">
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                      <Progress
                        value={(recordingTime % 60) * 1.67}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Media Library */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Media Library
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {mediaFiles.filter((f) => f.type === "screen").length}{" "}
                      files
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {mediaFiles.filter((f) => f.type === "screen").length ===
                    0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                          <Monitor className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-muted-foreground">
                          No screen recordings yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Start recording to see your files here
                        </p>
                      </div>
                    ) : (
                      mediaFiles
                        .filter((file) => file.type === "screen")
                        .map((file) => (
                          <div
                            key={file.id}
                            className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all cursor-pointer"
                            onClick={() => setSelectedFile(file)}
                          >
                            <div className="relative">
                              {file.thumbnailUrl ? (
                                <img
                                  src={file.thumbnailUrl}
                                  alt="Screen recording thumbnail"
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                                  <Monitor className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium capitalize text-sm truncate">
                                  {file.type} Recording
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {file.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {file.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(file.duration)}
                                  </span>
                                )}
                                {file.size && (
                                  <span>• {formatBytes(file.size)}</span>
                                )}
                                {file.mouseEvents &&
                                  file.mouseEvents.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <MousePointer className="w-3 h-3" />
                                      {file.mouseEvents.length} events
                                    </span>
                                  )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(file.timestamp).toLocaleTimeString()}
                              </p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => startAnnotation(file)}
                                title="Annotate"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => createGif(file)}
                                disabled={isCreatingGif}
                                title="Create GIF"
                              >
                                <Image className="w-4 h-4" alt="" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => downloadFile(file)}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => deleteFile(file.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Image Tab Content */}
          <TabsContent value="image" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Screen Capture */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Screen Capture
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-sm">
                        Click "Capture Screen" to take a screenshot
                      </p>
                      <p className="text-xs opacity-60">
                        Screen captures are saved as images for annotation
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={captureScreenAsImage}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                      disabled={permissionStatus !== "granted"}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Capture Screen
                    </Button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Screen captures are saved as high-quality images that you
                      can annotate using the advanced annotation tools.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Media Library */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Image Library
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {mediaFiles.filter((f) => f.type === "image").length}{" "}
                      files
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {mediaFiles.filter((f) => f.type === "image").length ===
                    0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                          <Monitor className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-muted-foreground">
                          No screen captures yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Capture your screen to see images here
                        </p>
                      </div>
                    ) : (
                      mediaFiles
                        .filter((file) => file.type === "image")
                        .map((file) => (
                          <div
                            key={file.id}
                            className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all cursor-pointer"
                            onClick={() => setSelectedFile(file)}
                          >
                            <div className="relative">
                              {file.thumbnailUrl ? (
                                <img
                                  src={file.thumbnailUrl}
                                  alt="Screen capture"
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                                  <Monitor className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit className="w-6 h-6 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium capitalize text-sm truncate">
                                  {file.type} Capture
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {file.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {file.size && (
                                  <span>{formatBytes(file.size)}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(file.timestamp).toLocaleTimeString()}
                              </p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => startAnnotation(file)}
                                title="Annotate"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => downloadFile(file)}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => deleteFile(file.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* GIF Tab Content */}
          <TabsContent value="gif" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recording Preview */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      GIF Recording
                    </span>
                    {isRecording && (
                      <Badge
                        variant="destructive"
                        className="animate-pulse px-3 py-1"
                      >
                        <Square className="w-3 h-3 mr-1" />
                        REC {formatTime(recordingTime)}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                    {streamRef.current ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-slate-500" alt="" />
                        </div>
                        <p className="text-sm">Preview will appear here</p>
                        <p className="text-xs opacity-60">
                          Click "Start Recording" to begin
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-center">
                    {!isRecording ? (
                      <Button
                        onClick={() => startRecording("gif")}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        disabled={permissionStatus !== "granted"}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={stopRecording}
                          variant="destructive"
                          className="font-medium px-6 py-3 rounded-xl"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop
                        </Button>
                        {isPaused ? (
                          <Button
                            onClick={resumeRecording}
                            className="font-medium px-6 py-3 rounded-xl"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            onClick={pauseRecording}
                            className="font-medium px-6 py-3 rounded-xl"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Record short video clips that will be automatically
                      converted to animated GIFs.
                    </p>
                  </div>

                  {isRecording && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Recording Progress</span>
                        <span className="font-mono">
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                      <Progress
                        value={(recordingTime % 60) * 1.67}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Media Library */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      GIF Library
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {mediaFiles.filter((f) => f.type === "gif").length} files
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {mediaFiles.filter((f) => f.type === "gif").length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                          <Image className="w-8 h-8 text-slate-400" alt="" />
                        </div>
                        <p className="text-muted-foreground">No GIFs yet</p>
                        <p className="text-sm text-muted-foreground">
                          Record a video to create GIFs
                        </p>
                      </div>
                    ) : (
                      mediaFiles
                        .filter((file) => file.type === "gif")
                        .map((file) => (
                          <div
                            key={file.id}
                            className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all cursor-pointer"
                            onClick={() => setSelectedFile(file)}
                          >
                            <div className="relative">
                              {file.thumbnailUrl ? (
                                <img
                                  src={file.thumbnailUrl}
                                  alt="GIF thumbnail"
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                                  <Image
                                    className="w-8 h-8 text-slate-400"
                                    alt=""
                                  />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium capitalize text-sm truncate">
                                  {file.type} Animation
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {file.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {file.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(file.duration)}
                                  </span>
                                )}
                                {file.size && (
                                  <span>• {formatBytes(file.size)}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(file.timestamp).toLocaleTimeString()}
                              </p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => startAnnotation(file)}
                                title="Annotate"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => downloadFile(file)}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => deleteFile(file.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Annotation Panel */}
        {isAnnotating && selectedFile && (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Advanced Annotation Studio
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAnnotating(false)}
                  >
                    Close
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFile.type === "video" ||
              selectedFile.type === "screen" ? (
                <VideoAnnotationCanvas
                  videoUrl={selectedFile.url}
                  width={800}
                  height={600}
                  onSave={saveAnnotations}
                  onExportPDF={exportToPDF}
                />
              ) : (
                <AdvancedAnnotationCanvas
                  mediaUrl={selectedFile.url}
                  mediaType="image"
                  width={800}
                  height={600}
                  onSave={saveAnnotations}
                  onExportPDF={exportToPDF}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* GIF Creation Progress */}
        {isCreatingGif && (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  Creating GIF
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-mono">{Math.round(gifProgress)}%</span>
                </div>
                <Progress value={gifProgress} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  Converting video frames to GIF format...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
