import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { runTask } from '@/lib/dispatch/executor';
import { logToBrain } from '@/lib/brain/unified';

export async function POST(req: NextRequest) {
  try {
    const { taskId, approve } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Missing required parameter: taskId' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Check if task exists and is awaiting approval
    const { data: task, error: fetchErr } = await serviceClient
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'awaiting_approval') {
      return NextResponse.json({ error: `Task status is '${task.status}', not 'awaiting_approval'.` }, { status: 400 });
    }

    if (approve === true) {
      console.log(`[Approval-API] Approving task ${taskId}. Resuming execution...`);
      
      // Resumes runTask with executeApprovedCall set to true
      runTask(taskId, true).catch((err: any) => {
        console.error(`[Approval-API] Error resuming task ${taskId}:`, err);
      });

      return NextResponse.json({ success: true, status: 'resumed', message: 'Task resumed successfully.' });
    } else {
      console.log(`[Approval-API] Rejecting task ${taskId}. Aborting execution...`);
      
      await serviceClient
        .from('agent_tasks')
        .update({
          status: 'failed',
          approval_gate: null,
          result: { error: 'Execution rejected by user approval gate.' }
        })
        .eq('id', taskId);

      await logToBrain({
        agent: 'Dispatch Guardrails',
        entry_type: 'flag',
        project: task.project || null,
        title: `Tier 1 Action Rejected: ${task.objective.substring(0, 40)}...`,
        summary: `Task "${task.objective}" was aborted because the user rejected the pending Tier 1 tool call.`,
        importance: 4,
        source: 'guardrail'
      });

      return NextResponse.json({ success: true, status: 'rejected', message: 'Task execution rejected and aborted.' });
    }

  } catch (err: any) {
    console.error('[Approval-API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
