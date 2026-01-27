import { NextResponse } from 'next/server';
import {
  getCreditCardStatements,
  getCreditCardStatementsByMonth,
  createCreditCardStatement,
} from '../../lib/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let statements;
    if (month && year) {
      statements = await getCreditCardStatementsByMonth(
        parseInt(month),
        parseInt(year)
      );
    } else {
      statements = await getCreditCardStatements();
    }
    return NextResponse.json(statements);
  } catch (error) {
    console.error('Error fetching credit card statements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit card statements' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const statement = await createCreditCardStatement(body);
    return NextResponse.json(statement, { status: 201 });
  } catch (error) {
    console.error('Error creating credit card statement:', error);
    return NextResponse.json(
      { error: 'Failed to create credit card statement' },
      { status: 500 }
    );
  }
}
