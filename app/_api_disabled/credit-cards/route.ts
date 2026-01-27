import { NextResponse } from 'next/server';
import { getCreditCards, createCreditCard } from '../../lib/queries';

export async function GET() {
  try {
    const creditCards = await getCreditCards();
    return NextResponse.json(creditCards);
  } catch (error) {
    console.error('Error fetching credit cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit cards' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const creditCard = await createCreditCard(body);
    return NextResponse.json(creditCard, { status: 201 });
  } catch (error) {
    console.error('Error creating credit card:', error);
    return NextResponse.json(
      { error: 'Failed to create credit card' },
      { status: 500 }
    );
  }
}
