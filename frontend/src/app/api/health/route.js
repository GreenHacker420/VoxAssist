import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'VoxAssist Frontend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'ERROR', 
        message: error.message,
        timestamp: new Date().toISOString() 
      }, 
      { status: 500 }
    );
  }
}
