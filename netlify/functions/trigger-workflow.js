// This file would be deployed as a serverless function
const { Octokit } = require("@octokit/rest");

// This would be set as an environment variable in your hosting platform
const GITHUB_TOKEN = process.env.GITHUB_PAT;

exports.handler = async function(event, context) {

  // Enable CORS for GitHub Pages
  const headers = {
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS enabled' })
    };
  }
  
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method not allowed" })
      };
    }
    
    // Check if body exists
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing request body" })
      };
    }
    
    // Parse request body with Base64 detection and decoding
    let body;
    try {
      // Check if body looks like Base64 (starts with eyJ which is common for encoded JSON)
      if (event.body.startsWith('eyJ')) {
        console.log("Detected Base64 encoded body, decoding...");
        const decoded = Buffer.from(event.body, 'base64').toString('utf8');
        console.log("Decoded body:", decoded);
        body = JSON.parse(decoded);
      } else {
        // Try standard JSON parsing
        body = JSON.parse(event.body);
      }
      console.log("Successfully parsed body:", body);
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Invalid request body", 
          details: e.message,
          receivedBody: event.body.substring(0, 200)
        })
      };
    }
    
    const { inputs, email } = body;
    
    // Basic validation
    if (!inputs) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Missing required parameters",
          receivedBody: body 
        })
      };
    }
    
    if (!inputs.run_mode) {
      return {
        statusCode: 400,
        headers, 
        body: JSON.stringify({ 
          error: "Missing required parameter: run_mode",
          receivedInputs: inputs
        })
      };
    }
    
    // Check GitHub token
    if (!GITHUB_TOKEN) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "GitHub token is not configured" })
      };
    }
    
    console.log("Inputs for workflow:", inputs);
    
    // Initialize Octokit with the GitHub token
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });

    // Prepare workflow inputs - convert regions array to JSON string
    const workflowInputs = {
      case: 'TAR'
      baseline: 'df'
      sim1: 'BASE'
      totalSims: '1'
      maxSimultaneous: '1'
    };

    if (inputs.regions && Array.isArray(inputs.regions)) {
      workflowInputs.regions = JSON.stringify(inputs.regions);
      console.log("Prepared regions for workflow:", workflowInputs.regions);
    } else {
      console.warn("No regions array found in inputs");
      workflowInputs.regions = "[]";
    }
    
    // Get the current branch - fallback to main if not set
    const currentBranch = process.env.BRANCH || 'main';
    console.log("Using branch:", currentBranch);

    // Trigger the workflow
    await octokit.actions.createWorkflowDispatch({
      owner: 'reza-nia',
      repo: 'miragrodep-3',
      workflow_id: 'run-miragrodep-model.yml',
      ref: 'Beta1', 
      inputs: workflowInputs
    });
    
    // Get the latest run
    const { data: runs } = await octokit.actions.listWorkflowRuns({
      owner: 'reza-nia',
      repo: 'miragrodep-3',
      workflow_id: 'run-miragrodep-model.yml',
      per_page: 1
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Workflow triggered successfully",
        run: runs.workflow_runs.length > 0 ? runs.workflow_runs[0] : null
      })
    };
  } catch (error) {
    console.error("Error triggering workflow:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to trigger workflow",
        details: error.message
      })
    };
  }
};