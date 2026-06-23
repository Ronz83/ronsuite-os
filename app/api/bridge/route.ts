import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    // 1. Security Check: Validate token using shared SUPABASE_SERVICE_ROLE_KEY
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action, input } = await req.json() as {
      action: string;
      input: any;
    };

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    let result: any = null;

    switch (action) {
      case 'list_local_dir': {
        const dirPath = input?.dir_path || input?.path || input?.dir;
        if (!dirPath || typeof dirPath !== 'string') {
          return NextResponse.json({ success: false, error: 'dir_path is required' }, { status: 400 });
        }
        if (!dirPath.toLowerCase().startsWith('c:\\users\\ronald')) {
          return NextResponse.json({ success: false, error: 'Access denied: Path must reside under C:\\Users\\Ronald' }, { status: 403 });
        }
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        result = files.map(f => ({ name: f.name, isDirectory: f.isDirectory() }));
        break;
      }

      case 'read_local_file': {
        const filePath = input?.file_path || input?.path || input?.file || input?.filePath;
        if (!filePath || typeof filePath !== 'string') {
          return NextResponse.json({ success: false, error: 'file_path is required' }, { status: 400 });
        }
        if (!filePath.toLowerCase().startsWith('c:\\users\\ronald')) {
          return NextResponse.json({ success: false, error: 'Access denied: File must reside under C:\\Users\\Ronald' }, { status: 403 });
        }
        // Basic security check: do not allow reading .env or credential-heavy files directly
        const fileLower = filePath.toLowerCase();
        if (fileLower.includes('.env') || fileLower.includes('credential') || fileLower.includes('password')) {
          return NextResponse.json({ success: false, error: 'Prohibited file type (Tier 2/Credential safety block)' }, { status: 403 });
        }
        const content = await fs.readFile(filePath, 'utf8');
        result = content;
        break;
      }

      case 'write_local_file': {
        const filePath = input?.file_path || input?.path || input?.file || input?.filePath;
        const content = input?.content || input?.text || '';
        if (!filePath || typeof filePath !== 'string') {
          return NextResponse.json({ success: false, error: 'file_path is required' }, { status: 400 });
        }
        if (!filePath.toLowerCase().startsWith('c:\\users\\ronald')) {
          return NextResponse.json({ success: false, error: 'Access denied: File must reside under C:\\Users\\Ronald' }, { status: 403 });
        }
        await fs.writeFile(filePath, content, 'utf8');
        result = 'Success';
        break;
      }

      case 'run_command': {
        const command = input?.command || input?.cmd;
        if (!command || typeof command !== 'string') {
          return NextResponse.json({ success: false, error: 'command is required' }, { status: 400 });
        }
        // Refuse commands containing credential patterns
        const cmdLower = command.toLowerCase();
        if (cmdLower.includes('.env') || cmdLower.includes('credential') || cmdLower.includes('password') || cmdLower.includes('secrets')) {
          return NextResponse.json({ success: false, error: 'Command blocked: safety policy violation' }, { status: 403 });
        }
        const { stdout, stderr } = await execAsync(command);
        result = { stdout, stderr };
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[Local Bridge API] Error executing action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
