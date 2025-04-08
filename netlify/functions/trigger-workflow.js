// This file would be deployed as a serverless function
const { Octokit } = require("@octokit/rest");

// This would be set as an environment variable in your hosting platform
const GITHUB_TOKEN = process.env.GITHUB_PAT;

exports.handler = async function(event, context) {
  // Enable CORS for GitHub Pages
  const headers = {
    "Access-Control-Allow-Origin": "*", // Better to specify your GitHub Pages URL exactly
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
    
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      console.error("Error parsing request body:", e);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid request body" })
      };
    }
    
    const { inputs, email } = body;
    
    // Log request for debugging
    console.log("Received request:", { inputs, email });
    
    // Basic validation
    if (!inputs || !inputs.run_mode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required parameters" })
      };
    }
    
    // Initialize Octokit with the GitHub token
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Log step for debugging
    console.log("Triggering workflow dispatch...");
    
    // Trigger the workflow
    await octokit.actions.createWorkflowDispatch({
      owner: 'reza-nia',
      repo: 'miragrodep-3',
      workflow_id: 'run-miragrodep.yml',
      ref: 'main', // or the branch your workflow is on
      inputs: inputs
    });
    
    console.log("Workflow triggered, getting latest run...");
    
    // Get the latest run
    const { data: runs } = await octokit.actions.listWorkflowRuns({
      owner: 'reza-nia',
      repo: 'miragrodep-3',
      workflow_id: 'run-miragrodep.yml',
      per_page: 1
    });
    
    // If provided, store email for notifications (would integrate with a notification system)
    if (email && runs.workflow_runs.length > 0) {
      console.log(`Email ${email} registered for run ${runs.workflow_runs[0].id}`);
      // In a full implementation, you would store this mapping in a database
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
