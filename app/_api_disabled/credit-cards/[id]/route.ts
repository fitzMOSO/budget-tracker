import { NextResponse } from 'next/server';
import { updateCreditCard, deleteCreditCard } from '../../../lib/queries';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const creditCard = await updateCreditCard(id, body);
    if (!creditCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }
    return NextResponse.json(creditCard);
  } catch (error) {
    console.error('Error updating credit card:', error);
    return NextResponse.json(
      { error: 'Failed to update credit card' },
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
    const deleted = await deleteCreditCard(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit card:', error);
    return NextResponse.json(
      { error: 'Failed to delete credit card' },
      { status: 500 }
    );
  }
}
