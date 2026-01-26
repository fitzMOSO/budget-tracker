import { NextResponse } from 'next/server';
import {
  updateCreditCardStatement,
  deleteCreditCardStatement,
} from '../../../lib/queries';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const statement = await updateCreditCardStatement(id, body);
    if (!statement) {
      return NextResponse.json(
        { error: 'Credit card statement not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(statement);
  } catch (error) {
    console.error('Error updating credit card statement:', error);
    return NextResponse.json(
      { error: 'Failed to update credit card statement' },
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
    const deleted = await deleteCreditCardStatement(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Credit card statement not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit card statement:', error);
    return NextResponse.json(
      { error: 'Failed to delete credit card statement' },
      { status: 500 }
    );
  }
}
