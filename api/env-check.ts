import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Environment check API called');
  
  // Check environment variables
  const envCheck = {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing',
    NODE_ENV: process.env.NODE_ENV || 'Not set'
  };
  
  console.log('Environment variables status:', envCheck);
  
  return res.status(200).json({
    success: true,
    message: 'Environment check completed',
    environment: envCheck,
    timestamp: new Date().toISOString()
  });
}
