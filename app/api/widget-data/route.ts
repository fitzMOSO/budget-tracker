import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  // In a real application, you would fetch this data from your database
  const data = {
    income: '$5,000',
    expenses: '$2,500',
  };

  return NextResponse.json(data);
}
