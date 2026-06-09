import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { routeTask } from '@/lib/dispatch/router';
import { runTask } from '@/lib/dispatch/executor';

// POST /api/brain/dispatch — Create and run a task
export async function POST(req: NextRequest) {
  try {
    const { objective, project, priority, definition_of_done, created_by } = await req.json();
    if (!objective) {
      return NextResponse.json({ error: 'Missing required parameter: objective' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    
    // 1. Route the task (determine assignee and model tier)
    const decision = routeTask(objective);

    // 2. Insert into database
    const { data: task, error: insertErr } = await serviceClient
      .from('agent_tasks')
      .insert({
        objective,
        project: project || null,
        priority: priority ?? 3,
        definition_of_done: definition_of_done || null,
        assigned_to: decision.assignedTo,
        model_tier: decision.modelTier,
        status: 'queued',
        created_by: created_by || 'Hermes'
      })
      .select()
      .single();

    if (insertErr || !task) {
      throw new Error(`Failed to create task in database: ${insertErr?.message}`);
    }

    // 3. Trigger execution in background (non-blocking)
    runTask(task.id).catch((err: any) => {
      console.error(`[Dispatch-API] Error executing task ${task.id} in background:`, err);
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      assignedTo: task.assigned_to,
      modelTier: task.model_tier,
      status: task.status,
      message: `Dispatched task successfully to ${task.assigned_to}.`
    });

  } catch (err: any) {
    console.error('[Dispatch-API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/brain/dispatch — Retrieve tasks list or status
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');
    const serviceClient = createServiceClient();

    if (taskId) {
      const { data: task, error } = await serviceClient
        .from('agent_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json(task);
    }

    // List recent tasks
    const { data: tasks, error } = await serviceClient
      .from('agent_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return NextResponse.json(tasks);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
