import GIF from 'gif.js';

export interface GifOptions {
  width: number;
  height: number;
  quality?: number;
  delay?: number;
  repeat?: number;
}

export class GifCreator {
  private gif: GIF;
  private options: GifOptions;

  constructor(options: GifOptions) {
    this.options = {
      quality: 10,
      delay: 200,
      repeat: 0,
      ...options
    };

    this.gif = new GIF({
      ...this.options,
      workerScript: '/gif.worker.js',
      workers: 2,
      quality: this.options.quality,
    });
  }

  addFrame(videoElement: HTMLVideoElement, timestamp?: number): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = this.options.width;
    canvas.height = this.options.height;

    // Draw video frame to canvas
    ctx.drawImage(videoElement, 0, 0, this.options.width, this.options.height);

    // Add frame to GIF
    this.gif.addFrame(canvas, { delay: this.options.delay });
  }

  addFramesFromVideo(
    videoElement: HTMLVideoElement, 
    duration: number, 
    frameRate: number = 5,
    onProgress?: (progress: number) => void
  ): void {
    const totalFrames = Math.floor(duration * frameRate);
    const frameInterval = 1000 / frameRate;

    let currentFrame = 0;
    const captureFrame = () => {
      if (currentFrame >= totalFrames) return;

      videoElement.currentTime = (currentFrame * frameInterval) / 1000;
      
      videoElement.onseeked = () => {
        this.addFrame(videoElement);
        currentFrame++;
        
        if (onProgress) {
          onProgress((currentFrame / totalFrames) * 100);
        }

        if (currentFrame < totalFrames) {
          requestAnimationFrame(captureFrame);
        }
      };
    };

    captureFrame();
  }

  async render(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });

      this.gif.on('abort', () => {
        reject(new Error('GIF creation aborted'));
      });

      this.gif.render();
    });
  }

  abort(): void {
    this.gif.abort();
  }
}

export const createGifFromVideo = async (
  videoUrl: string,
  options: GifOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      const gifCreator = new GifCreator(options);
      
      video.onseeked = () => {
        gifCreator.addFramesFromVideo(
          video,
          Math.min(video.duration, 10), // Limit to 10 seconds
          5, // 5 frames per second
          onProgress
        );

        gifCreator.render()
          .then(resolve)
          .catch(reject);
      };

      // Start seeking to trigger the process
      video.currentTime = 0;
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
  });
};