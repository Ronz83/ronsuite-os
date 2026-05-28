-- Migration: 006_hermes_filesystem_tools
-- Applied: via Supabase SQL Editor
-- Binds list_local_dir and read_local_file tools to Hermes orchestrator agent

update agents
set tools = '["list_local_dir", "read_local_file"]'
where name = 'Hermes';
