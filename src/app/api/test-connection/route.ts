import { testSupabaseConnection } from '@/lib/supabase/test-connection';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await testSupabaseConnection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 }
    );
  }
} 