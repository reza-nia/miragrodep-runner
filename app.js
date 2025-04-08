document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('runModelForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultCard = document.getElementById('resultCard');
    const statusMessage = document.getElementById('statusMessage');
    const runDetails = document.getElementById('runDetails');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    
    // The API endpoint to trigger the workflow
    const API_URL = 'https://api.github.com/repos/reza-nia/miragrodep-3/actions/workflows/run-miragrodep.yml/dispatches';
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading overlay
        loadingOverlay.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        
        // Collect form data
        const formData = new FormData(form);
        const inputs = Object.fromEntries(formData.entries());
        
        // Format the payload for GitHub API
        const payload = {
            ref: 'main', // or whatever branch your workflow is on
            inputs: {
                run_mode: inputs.run_mode,
                agg: inputs.agg,
                case: inputs.case,
                proj: inputs.proj,
                baseline: inputs.baseline,
                sim1: inputs.sim1,
                totalSims: inputs.totalSims,
                maxSimultaneous: inputs.maxSimultaneous,
                diag: inputs.diag,
                pov: inputs.pov
            }
        };
        
        try {
            // This would normally be done server-side to protect your token
            // For demonstration; in production this should be handled by a serverless function
            const accessToken = await getAccessToken();
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${await response.text()}`);
            }
            
            // Since workflow_dispatch doesn't return the run ID directly,
            // we need to query for the latest run
            const latestRun = await getLatestWorkflowRun(accessToken);
            
            // Hide loading and show success
            loadingOverlay.classList.add('d-none');
            resultCard.classList.remove('d-none');
            
            statusMessage.innerHTML = `
                <p>Model run started successfully!</p>
                <p>Status: <span class="status-pending">Pending</span></p>
            `;
            
            runDetails.innerHTML = `
                <p><strong>Run ID:</strong> ${latestRun.id}</p>
                <p><strong>Started at:</strong> ${new Date(latestRun.created_at).toLocaleString()}</p>
                <div class="run-link">
                    <a href="${latestRun.html_url}" target="_blank" class="btn btn-outline-primary">
                        View Run on GitHub
                    </a>
                </div>
            `;
            
            // Save email locally if provided
            const email = inputs.email;
            if (email) {
                localStorage.setItem('modelRunnerEmail', email);
                // In a real implementation, you would store this email with the run ID
                // and set up a notification system
            }
            
        } catch (err) {
            // Handle errors
            loadingOverlay.classList.add('d-none');
            errorAlert.classList.remove('d-none');
            errorMessage.textContent = err.message;
            console.error('Error starting workflow:', err);
        }
    });
    
    // This is a placeholder - in a real app, this would be handled server-side
    // to protect your token
    async function getAccessToken() {
        // In production, this would call your backend API that securely stores the token
        return 'YOUR_GITHUB_PAT_WILL_BE_HERE';
    }
    
    async function getLatestWorkflowRun(token) {
        const response = await fetch('https://api.github.com/repos/reza-nia/miragrodep-3/actions/runs?per_page=1', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch workflow run information');
        }
        
        const data = await response.json();
        return data.workflow_runs[0];
    }
    
    // Restore email from localStorage if it exists
    const savedEmail = localStorage.getItem('modelRunnerEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
    }
});
