import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { fileName, fileType, fileContent } = await req.json() as {
      fileName: string;
      fileType: string;
      fileContent: string;
    };

    if (!fileName || !fileType || !fileContent) {
      return NextResponse.json({ success: false, error: 'Missing required file data' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    
    // Insert file into hermes_attachments
    const { data: attachment, error } = await serviceClient
      .from('hermes_attachments')
      .insert({
        file_name: fileName,
        file_type: fileType,
        content: fileContent,
        extracted_text: null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, attachment });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
