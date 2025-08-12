# Screen Recording Web App

A professional web application for video recording, screen capture, GIF creation, and advanced annotation tools built with Next.js 15, TypeScript, and modern web technologies.

## 🌟 Features

### 🎥 Recording Capabilities

#### Video Recording

- **High-Quality Capture**: Record videos with adjustable quality settings (1080p 60fps, 720p 30fps, 480p 15fps)
- **Audio Integration**: Full microphone support with echo cancellation and noise suppression
- **Real-time Preview**: Live camera preview during recording
- **Format Options**: Support for WebM and MP4 output formats
- **Recording Controls**: Start, stop, pause, and resume functionality

#### Screen Recording

- **Full Screen Capture**: Record entire screen or selected application windows
- **Audio Support**: Optional system audio and microphone recording
- **High Resolution**: Support for up to 1920x1080 resolution
- **Flexible Quality**: Same quality settings as video recording

#### Image Capture

- **Screenshot Functionality**: Instant screen capture as high-quality images
- **Direct Annotation**: Captured images can be immediately annotated
- **Multiple Formats**: PNG format with optimal compression
- **Thumbnail Generation**: Automatic thumbnail creation for media library

#### GIF Creation

- **Video to GIF**: Convert recorded videos to animated GIFs
- **Customizable Settings**: Adjustable dimensions, quality, and frame delay
- **Progress Tracking**: Real-time conversion progress with visual feedback
- **Optimized Output**: Efficient file sizes with good quality

### 🎨 Annotation System

#### Video Annotation

- **Timeline-based Annotations**: Add annotations at specific timestamps
- **Synchronized Display**: Annotations appear/disappear based on video timeline
- **Multiple Tools**: Text, arrows, shapes, drawing, highlighting, and stamps
- **Export Capabilities**: Export annotated videos with timeline data

#### Image Annotation

- **Comprehensive Tools**: Full suite of annotation tools for static images
- **Layer Management**: Support for multiple annotation layers
- **Precision Controls**: Fine-tuned positioning and styling options
- **PDF Export**: Generate professional PDF reports with annotations

#### Advanced Features

- **Smart Component Selection**: Automatically chooses appropriate annotation tool based on media type
- **Real-time Preview**: Live preview of annotations during creation
- **Save/Load**: Persistent storage of annotation data
- **Collaboration Ready**: Structured data format for future collaboration features

### 🔐 Security & Privacy

#### Permission Management

- **Granular Controls**: Separate camera and microphone permission management
- **Real-time Status**: Visual indicators (✅ granted, ❌ denied, ⏳ pending)
- **Browser Guidance**: Step-by-step instructions for different browsers
- **Individual Enablement**: Enable camera or microphone independently

#### Data Protection

- **Auto-cleanup**: Files automatically deleted after 1 hour
- **Local Processing**: All media processing happens client-side
- **No Server Storage**: Media files are not permanently stored on servers
- **Secure Environment**: HTTPS-ready with proper security headers

### 🎯 User Experience

#### Interface Design

- **Modern UI**: Built with shadcn/ui components for consistency
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode**: Full dark/light theme support
- **Intuitive Navigation**: Tab-based interface for different recording modes

#### Advanced Features

- **Mouse Event Tracking**: Optional capture of mouse movements and clicks
- **Quality Presets**: Quick access to common quality settings
- **Progress Indicators**: Visual feedback for all operations
- **Error Handling**: Comprehensive error messages and recovery options

#### Media Management

- **Media Library**: Organized view of all recordings and captures
- **Thumbnail Previews**: Quick visual reference for all media files
- **File Operations**: Download, delete, and annotate functionality
- **Metadata Display**: File size, duration, timestamp information

## 🛠 Technology Stack

### Core Framework

- **Next.js 15**: React framework with App Router
- **TypeScript 5**: Type-safe JavaScript development
- **React 19**: Latest React version with modern features
- **Tailwind CSS 4**: Utility-first CSS framework

### UI Components

- **shadcn/ui**: Modern, accessible component library
- **Radix UI**: Headless UI primitives
- **Lucide React**: Beautiful icon library
- **Framer Motion**: Smooth animations and transitions

### Media Processing

- **MediaRecorder API**: Native browser recording capabilities
- **Canvas API**: Image processing and annotation rendering
- **gif.js**: GIF creation and manipulation
- **jsPDF**: PDF generation for reports

### State Management

- **Zustand**: Lightweight state management
- **TanStack Query**: Server state management
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation

### Development Tools

- **Prisma**: Database ORM and management
- **ESLint**: Code linting and quality assurance
- **Nodemon**: Development server with hot reload
- **tsx**: TypeScript execution

## 📁 Project Structure

```
media-recorder-studio/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── health/        # Health check endpoint
│   │   │   └── media/         # Media handling endpoints
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main application page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── annotation-canvas.tsx
│   │   ├── advanced-annotation-canvas.tsx
│   │   └── video-annotation-canvas.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib/                  # Utility libraries
│       ├── db.ts             # Database client
│       ├── socket.ts         # Socket.IO setup
│       ├── gif-creator.ts    # GIF creation utilities
│       ├── pdf-generator.ts  # PDF generation utilities
│       └── utils.ts          # General utilities
├── public/                   # Static assets
│   ├── gif.worker.js        # GIF processing worker
│   ├── logo.svg             # Application logo
│   └── robots.txt           # SEO configuration
├── prisma/                  # Database schema
│   └── schema.prisma        # Prisma schema file
├── db/                      # Database files
│   └── custom.db           # SQLite database
├── components.json          # shadcn/ui configuration
├── next.config.ts          # Next.js configuration
├── server.ts               # Custom server file
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

### Key Libraries and Their Purpose

#### Media Processing

- **gif.js**: Client-side GIF creation from video frames
- **jsPDF**: PDF generation for annotation reports
- **Canvas API**: Native browser API for image manipulation

#### Real-time Communication

- **socket.io**: WebSocket library for real-time features
- **socket.io-client**: Client-side Socket.IO integration

#### UI/UX

- **shadcn/ui**: Modern, accessible component library built on Radix UI
- **Radix UI**: Headless UI primitives for accessibility
- **Lucide React**: Beautiful, consistent icon library
- **Framer Motion**: Production-ready motion library for React
- **Tailwind CSS**: Utility-first CSS framework

#### State Management

- **Zustand**: Small, fast, and scale-resistant bearbones state management
- **TanStack Query**: Powerful asynchronous state management for server state
- **React Hook Form**: Performant, flexible, and easy-to-use forms
- **Zod**: TypeScript-first schema validation

#### Development & Build

- **Prisma**: Next-generation ORM for Node.js and TypeScript
- **tsx**: TypeScript execution and development tool
- **Nodemon**: Monitor for changes and automatically restart the server
- **ESLint**: Pluggable JavaScript linter for identifying and fixing problems

## 🗄 Database Schema

### Current Schema

The application uses Prisma with SQLite for database operations. Current schema includes:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Database Setup

1. **Install Dependencies**: Prisma and SQLite are included in package.json
2. **Environment Variables**: Set `DATABASE_URL` in `.env` file
3. **Database Commands**:
   ```bash
   npm run db:push    # Push schema to database
   npm run db:generate # Generate Prisma client
   npm run db:migrate # Create and apply migrations
   npm run db:reset   # Reset database
   ```

### Future Schema Extensions

Planned models for enhanced functionality:

- `MediaFile`: Store metadata about recorded media
- `Annotation`: Persist annotation data
- `Session`: User session management
- `Settings`: User preferences and configuration

## 🚀 Deployment

### Development Setup

#### Prerequisites

- Node.js 18+
- npm or yarn package manager
- SQLite (included with Prisma)

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd media-recorder-studio

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:push
npm run db:generate

# Start development server
npm run dev
```

#### Development Commands

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
```

#### Development Setup Details

**Custom Development Server**

- Uses `nodemon` for file watching and automatic restart
- Watches `server.ts`, `src/` directory for changes
- Supports `.ts`, `.tsx`, `.js`, `.jsx` file extensions
- Logs output to `dev.log` for debugging

**Hot Reload Configuration**

- Next.js hot module replacement disabled in favor of nodemon
- Custom webpack configuration ignores file changes during development
- Automatic restart on file changes for faster development cycle
- Socket.IO server restarts automatically with code changes

**Development Logging**

- All development output logged to `dev.log`
- Production server logs to `server.log`
- Real-time compilation status and error reporting

### Production Deployment

#### Custom Server Configuration

This application uses a custom Next.js server with Socket.IO integration:

- **Server File**: `server.ts` - Custom HTTP server with Socket.IO support
- **Socket.IO**: Real-time communication at `/api/socketio`
- **Development**: Uses nodemon for hot reload with file watching
- **Production**: Optimized for production with proper error handling

#### Build Process

```bash
# Build the application
npm run build

# Generate database client
npm run db:generate

# Start production server
npm run start
```

#### Environment Variables

Create `.env` file with required variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# Application (optional)
NODE_ENV="production"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI SDK (optional)
Z_AI_API_KEY="your-api-key"
```

#### Next.js Configuration

The application uses custom Next.js configuration in `next.config.ts`:

- **TypeScript**: Build errors ignored for development flexibility
- **React Strict Mode**: Disabled for compatibility with custom server
- **Webpack**: Custom watch configuration for nodemon integration
- **ESLint**: Build errors ignored for production deployment

#### Deployment Platforms

##### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add all required environment variables
3. **Build Settings**:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
4. **Database**: Use Vercel Postgres or external SQLite storage

##### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build
RUN npm run db:generate

EXPOSE 3000
CMD ["npm", "start"]
```

##### Traditional Server

1. **Server Requirements**: Node.js 18+, npm
2. **Upload Files**: Copy project files to server
3. **Install Dependencies**: `npm install --production`
4. **Build Application**: `npm run build`
5. **Start Service**: Use PM2 or similar process manager
6. **Reverse Proxy**: Configure Nginx or Apache

#### Security Considerations

- **HTTPS**: Always use HTTPS in production
- **Environment Variables**: Never commit sensitive data to repository
- **File Permissions**: Proper file system permissions for SQLite database
- **Rate Limiting**: Implement rate limiting for API endpoints
- **CORS**: Configure Cross-Origin Resource Sharing as needed

### Performance Optimization

#### Build Optimization

- **Code Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Next.js Image component for optimized images
- **Bundle Analysis**: Use `@next/bundle-analyzer` for bundle optimization
- **Caching**: Implement proper caching strategies

#### Runtime Optimization

- **Database Indexing**: Add indexes for frequently queried fields
- **Connection Pooling**: Configure database connection pooling
- **CDN**: Use CDN for static assets
- **Compression**: Enable gzip/brotli compression

## 📝 API Documentation

### Core Endpoints

#### Health Check

```
GET /api/health
```

Returns application health status.

#### Media Upload

```
POST /api/media/upload
```

Upload media files for processing.

#### Media Files

```
GET /api/media/files/[fileName]
```

Access uploaded media files.

#### Media Cleanup

```
POST /api/media/cleanup
```

Clean up expired media files.

### WebSocket Support

Real-time communication through Socket.IO:

- **Connection**: `ws://localhost:3000/api/socketio`
- **Events**: Custom events for real-time updates
- **Rooms**: Support for room-based communication

## 🤝 Contributing

### Development Workflow

1. **Fork Repository**: Create a fork of the project
2. **Create Branch**: `git checkout -b feature/your-feature-name`
3. **Make Changes**: Implement your changes with proper testing
4. **Run Linting**: `npm run lint`
5. **Test Changes**: Ensure all functionality works correctly
6. **Submit Pull Request**: Create detailed PR with description

### Code Standards

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow ESLint configuration
- **Component Structure**: Use consistent component structure
- **Comments**: Add meaningful comments for complex logic
- **Testing**: Include tests for new features

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for general questions

## 🎯 Roadmap

### Planned Features

- [ ] User authentication and accounts
- [ ] Cloud storage integration
- [ ] Advanced collaboration features
- [ ] Mobile app support
- [ ] AI-powered annotation suggestions
- [ ] Advanced video editing capabilities
- [ ] Live streaming support
- [ ] Plugin system for extensibility

### Performance Improvements

- [ ] WebWorker for heavy processing
- [ ] Service worker for offline support
- [ ] Advanced caching strategies
- [ ] Database optimization
- [ ] CDN integration

---

Built with ❤️ using Next.js, TypeScript, and modern web technologies.
