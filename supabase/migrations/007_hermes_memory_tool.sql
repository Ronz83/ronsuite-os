-- Migration: 007_hermes_memory_tool
-- Applied: via Supabase SQL Editor
-- Binds the add_memory_record tool to Hermes to support autonomous brain-saving

update agents
set tools = '["list_local_dir", "read_local_file", "add_memory_record"]'
where name = 'Hermes';
