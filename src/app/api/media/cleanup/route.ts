import { NextRequest, NextResponse } from 'next/server';
import { readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false } = body;

    // Get all files in the upload directory
    const files = await readdir(UPLOAD_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    let deletedFiles = [];
    let totalSize = 0;

    for (const fileName of files) {
      const filePath = join(UPLOAD_DIR, fileName);
      
      try {
        const stats = await stat(filePath);
        const fileAge = now - stats.mtime.getTime();
        const isExpired = fileAge > oneHour;

        if (force || isExpired) {
          // Delete the file
          await unlink(filePath);
          deletedFiles.push({
            name: fileName,
            size: stats.size,
            age: fileAge,
            expired: isExpired
          });
          totalSize += stats.size;
        }
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      deletedFiles,
      totalFilesDeleted: deletedFiles.length,
      totalSizeFreed: totalSize,
      message: force 
        ? `Force deleted ${deletedFiles.length} files, freed ${formatBytes(totalSize)}`
        : `Cleaned up ${deletedFiles.length} expired files, freed ${formatBytes(totalSize)}`
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to perform cleanup' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all files in the upload directory
    const files = await readdir(UPLOAD_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    let fileList = [];
    let totalSize = 0;
    let expiredCount = 0;

    for (const fileName of files) {
      const filePath = join(UPLOAD_DIR, fileName);
      
      try {
        const stats = await stat(filePath);
        const fileAge = now - stats.mtime.getTime();
        const isExpired = fileAge > oneHour;

        const fileInfo = {
          name: fileName,
          size: stats.size,
          age: fileAge,
          expiresAt: stats.mtime.getTime() + oneHour,
          expired: isExpired,
          ageFormatted: formatDuration(fileAge),
          expiresAtFormatted: new Date(stats.mtime.getTime() + oneHour).toLocaleString()
        };

        fileList.push(fileInfo);
        totalSize += stats.size;
        
        if (isExpired) {
          expiredCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      files: fileList.sort((a, b) => b.age - a.age), // Sort by age (newest first)
      summary: {
        totalFiles: fileList.length,
        totalSize,
        expiredFiles: expiredCount,
        activeFiles: fileList.length - expiredCount,
        totalSizeFormatted: formatBytes(totalSize)
      }
    });

  } catch (error) {
    console.error('Error getting file status:', error);
    return NextResponse.json(
      { error: 'Failed to get file status' },
      { status: 500 }
    );
  }
}

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}