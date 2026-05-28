const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicApiKey = env.ANTHROPIC_API_KEY;
const braveApiKey = env.BRAVE_SEARCH_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !anthropicApiKey) {
  console.error("Missing configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const anthropic = new Anthropic({ apiKey: anthropicApiKey });

// Extract model slug from lib/anthropic.ts
const anthropicTsPath = path.join(__dirname, '..', 'lib', 'anthropic.ts');
const anthropicTsContent = fs.readFileSync(anthropicTsPath, 'utf8');
const modelMatch = anthropicTsContent.match(/export const MODEL = ['"]([^'"]+)['"]/);
const modelSlug = modelMatch ? modelMatch[1] : 'claude-3-5-sonnet-20240620';
console.log(`Using model configured in app: ${modelSlug}\n`);

async function runTest() {
  console.log("Fetching agents from database...");
  const { data: agents, error } = await supabase.from('agents').select('*');
  if (error) {
    console.error("Error fetching agents:", error);
    return;
  }

  console.log(`Found ${agents.length} agents.\n`);

  // --- Test 1: Dev Agent ---
  const devAgent = agents.find(a => a.role === 'developer');
  if (devAgent) {
    console.log("--- Testing Dev Agent ---");
    try {
      const response = await anthropic.messages.create({
        model: modelSlug, // Use a standard Sonnet model to verify prompt execution
        max_tokens: 1024,
        system: devAgent.system_prompt,
        messages: [
          { role: 'user', content: "What's the right approach for adding push notifications to RonSuite OS — should I use Supabase Realtime or a service like Knock?" }
        ]
      });
      console.log("Prompt: What's the right approach for adding push notifications to RonSuite OS — should I use Supabase Realtime or a service like Knock?\n");
      console.log("Response:\n", response.content[0].text, "\n");
    } catch (e) {
      console.error("Dev agent test failed:", e);
    }
  } else {
    console.log("Dev agent not found in database. Make sure migrations are run.");
  }

  // --- Test 2: Researcher Agent ---
  const researcherAgent = agents.find(a => a.role === 'researcher');
  if (researcherAgent) {
    console.log("--- Testing Researcher Agent ---");
    if (!braveApiKey) {
      console.log("Skipping Researcher Agent API test because BRAVE_SEARCH_API_KEY is empty in .env.local.");
    } else {
      // Mocking the tool loop for Researcher web_search
      console.log("Prompt: What are the top Caribbean business directories competing with Caricom Business right now?\n");
      console.log("(Simulating web_search tool call using Brave Search API...)\n");
      try {
        const searchRes = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent("top Caribbean business directories")}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': braveApiKey,
            },
          }
        );
        const searchData = await searchRes.json();
        const results = searchData.web?.results?.map(item => ({
          title: item.title,
          url: item.url,
          description: item.description,
        })).slice(0, 5) || [];
        
        console.log("Brave Search Results returned:", results.length, "results.");
        
        const response = await anthropic.messages.create({
          model: modelSlug,
          max_tokens: 1024,
          system: researcherAgent.system_prompt,
          tools: [
            {
              name: 'web_search',
              description: 'Perform a web search to find current information and facts',
              input_schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query to look up on the web',
                  },
                },
                required: ['query'],
              },
            }
          ],
          messages: [
            { role: 'user', content: "What are the top Caribbean business directories competing with Caricom Business right now?" },
            {
              role: 'assistant',
              content: [
                {
                  type: 'tool_use',
                  id: 'toolu_test_search',
                  name: 'web_search',
                  input: { query: 'top Caribbean business directories' }
                }
              ]
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: 'toolu_test_search',
                  content: JSON.stringify({ results, count: results.length })
                }
              ]
            }
          ]
        });
        if (response && response.content) {
          console.log("Response content blocks:", JSON.stringify(response.content, null, 2));
          if (response.content[0]) {
            console.log("Response text:\n", response.content[0].text, "\n");
          }
        } else {
          console.log("Response was empty or invalid structure:", JSON.stringify(response));
        }
      } catch (e) {
        console.error("Researcher agent test failed:", e);
      }
    }
  }

  // --- Test 3: Ops Agent ---
  const opsAgent = agents.find(a => a.role === 'operations');
  if (opsAgent) {
    console.log("--- Testing Ops Agent ---");
    try {
      // Get real task list count to see if list_tasks works
      const { data: tasks, error: taskErr } = await supabase.from('tasks').select('id, title, status, priority, projects(name)');
      const mockListTasksResult = JSON.stringify({ tasks: tasks || [], count: tasks?.length || 0 });

      console.log("Prompt: What's currently in flight across all projects?\n");
      console.log(`(Simulating list_tasks tool call returning ${tasks?.length || 0} tasks...)\n`);

      const response = await anthropic.messages.create({
        model: modelSlug,
        max_tokens: 1024,
        system: opsAgent.system_prompt,
        messages: [
          { role: 'user', content: "What's currently in flight across all projects?" },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'toolu_test_list',
                name: 'list_tasks',
                input: { project_slug: 'all', status: 'all' }
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_test_list',
                content: mockListTasksResult
              }
            ]
          }
        ]
      });
      console.log("Response:\n", response.content[0].text, "\n");
    } catch (e) {
      console.error("Ops agent test failed:", e);
    }
  }
}

runTest();
