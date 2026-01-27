import { NextResponse } from 'next/server';
import { deleteSavingsContribution } from '../../../lib/queries';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteSavingsContribution(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Savings contribution not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting savings contribution:', error);
    return NextResponse.json(
      { error: 'Failed to delete savings contribution' },
      { status: 500 }
    );
  }
}
