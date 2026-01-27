import { NextResponse } from 'next/server';
import { getMonthlyBudget, upsertMonthlyBudget } from '../../lib/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    const budget = await getMonthlyBudget(parseInt(month), parseInt(year));
    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error fetching monthly budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly budget' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const budget = await upsertMonthlyBudget(body);
    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error creating/updating monthly budget:', error);
    return NextResponse.json(
      { error: 'Failed to create/update monthly budget' },
      { status: 500 }
    );
  }
}
