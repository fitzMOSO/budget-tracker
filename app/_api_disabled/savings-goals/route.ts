import { NextResponse } from 'next/server';
import { getSavingsGoals, createSavingsGoal } from '../../lib/queries';

export async function GET() {
  try {
    const savingsGoals = await getSavingsGoals();
    return NextResponse.json(savingsGoals);
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const savingsGoal = await createSavingsGoal(body);
    return NextResponse.json(savingsGoal, { status: 201 });
  } catch (error) {
    console.error('Error creating savings goal:', error);
    return NextResponse.json(
      { error: 'Failed to create savings goal' },
      { status: 500 }
    );
  }
}
