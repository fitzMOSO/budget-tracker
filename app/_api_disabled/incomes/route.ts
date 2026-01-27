import { NextResponse } from 'next/server';
import { getIncomes, getIncomesByMonth, createIncome } from '../../lib/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let incomes;
    if (month && year) {
      incomes = await getIncomesByMonth(parseInt(month), parseInt(year));
    } else {
      incomes = await getIncomes();
    }
    return NextResponse.json(incomes);
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incomes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const income = await createIncome(body);
    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error('Error creating income:', error);
    return NextResponse.json(
      { error: 'Failed to create income' },
      { status: 500 }
    );
  }
}
