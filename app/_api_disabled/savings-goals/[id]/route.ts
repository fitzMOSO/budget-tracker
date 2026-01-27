import { NextResponse } from 'next/server';
import { updateSavingsGoal, deleteSavingsGoal } from '../../../lib/queries';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const savingsGoal = await updateSavingsGoal(id, body);
    if (!savingsGoal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }
    return NextResponse.json(savingsGoal);
  } catch (error) {
    console.error('Error updating savings goal:', error);
    return NextResponse.json(
      { error: 'Failed to update savings goal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteSavingsGoal(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete savings goal' },
      { status: 500 }
    );
  }
}
