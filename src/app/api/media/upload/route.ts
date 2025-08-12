import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'webm';
    const fileName = `${type}-${timestamp}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return file info
    return NextResponse.json({
      success: true,
      file: {
        id: `${type}-${timestamp}`,
        name: fileName,
        type,
        size: file.size,
        path: filePath,
        url: `/api/media/files/${fileName}`,
        timestamp,
        expiresAt: timestamp + (60 * 60 * 1000) // 1 hour from now
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // List all files in the upload directory
    const { readdir, stat } = await import('fs/promises');
    const files = await readdir(UPLOAD_DIR);
    
    const fileList = await Promise.all(
      files.map(async (fileName) => {
        const filePath = join(UPLOAD_DIR, fileName);
        const stats = await stat(filePath);
        const timestamp = stats.mtime.getTime();
        
        return {
          name: fileName,
          size: stats.size,
          timestamp,
          expiresAt: timestamp + (60 * 60 * 1000),
          isExpired: Date.now() > timestamp + (60 * 60 * 1000)
        };
      })
    );

    return NextResponse.json({
      success: true,
      files: fileList
    });

  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}