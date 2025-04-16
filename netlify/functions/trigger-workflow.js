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

    // Create the workflow inputs object (THIS IS THE KEY FIX)
    // First, start with standard params we know the workflow accepts
    const workflowInputs = {
      run_mode: inputs.run_mode,
      agg: inputs.agg,
      proj: inputs.proj,
      diag: inputs.diag,
      pov: inputs.pov
    };

    // Add regions if provided (as JSON string)
    if (inputs.regions && Array.isArray(inputs.regions)) {
      workflowInputs.regions = JSON.stringify(inputs.regions);
      console.log("Prepared regions for workflow:", workflowInputs.regions);
    } else {
      console.warn("No regions array found in inputs");
      workflowInputs.regions = "[]";
    }

    // Add shockSize if provided
    if (inputs.shockSize) {
      workflowInputs.shockSize = inputs.shockSize;
      console.log("Added shock size:", inputs.shockSize);
    }

    // Use current branch or default to main
    const currentBranch = process.env.BRANCH || 'main';
    console.log("Using branch:", currentBranch);

    // Log what we're about to send to GitHub
    console.log("Prepared workflow inputs:", workflowInputs);

    try {
      console.log("Attempting to call GitHub API...");
      
      // Trigger the workflow
      await octokit.actions.createWorkflowDispatch({
        owner: 'reza-nia',
        repo: 'miragrodep-3',
        workflow_id: 'run-miragrodep-model.yml',
        ref: 'Beta1',
        inputs: workflowInputs
      });
      
      console.log("GitHub API call successful!");
    } catch (error) {
      console.error("GitHub API call failed:", {
        message: error.message,
        status: error.status || 'No status',
        data: error.response?.data || 'No data'
      });
      throw error; // Re-throw to be caught by outer handler
    }
    
    // IMPORTANT: Add delay here to allow GitHub to register the new run
    console.log("Waiting for 30 seconds to allow GitHub to register the new run...");
    await new Promise(resolve => setTimeout(resolve, 9000)); // 9-second delay
    
    console.log("Delay complete, now fetching latest workflow run...");
    
    // Get the latest run AFTER the delay
    const { data: runs } = await octokit.actions.listWorkflowRuns({
      owner: 'reza-nia',
      repo: 'miragrodep-3',
      workflow_id: 'run-miragrodep-model.yml',
      per_page: 1
    });
    
    if (runs.workflow_runs.length > 0) {
      console.log("Latest run found:", runs.workflow_runs[0].id);
    } else {
      console.log("No workflow runs found after delay");
    }
    
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