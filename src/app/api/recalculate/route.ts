import { NextRequest, NextResponse } from 'next/server';
import { calculateCostBreakdown } from '@/lib/engines/costEngine';
import type { CostAssumptions } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assumptions } = body as { assumptions: CostAssumptions };

    if (!assumptions) {
      return NextResponse.json({ error: 'assumptions required' }, { status: 400 });
    }

    const breakdown = calculateCostBreakdown(assumptions);
    return NextResponse.json({ breakdown }, { status: 200 });
  } catch (error) {
    console.error('[recalculate] Error:', error);
    return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 });
  }
}
