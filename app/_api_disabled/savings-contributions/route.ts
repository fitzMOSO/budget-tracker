import { NextResponse } from 'next/server';
import {
  getSavingsContributions,
  getSavingsContributionsByMonth,
  createSavingsContribution,
} from '../../lib/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let contributions;
    if (month && year) {
      contributions = await getSavingsContributionsByMonth(
        parseInt(month),
        parseInt(year)
      );
    } else {
      contributions = await getSavingsContributions();
    }
    return NextResponse.json(contributions);
  } catch (error) {
    console.error('Error fetching savings contributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings contributions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const contribution = await createSavingsContribution(body);
    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    console.error('Error creating savings contribution:', error);
    return NextResponse.json(
      { error: 'Failed to create savings contribution' },
      { status: 500 }
    );
  }
}
