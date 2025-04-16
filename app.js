document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('runModelForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultCard = document.getElementById('resultCard');
    const statusMessage = document.getElementById('statusMessage');
    const runDetails = document.getElementById('runDetails');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');
    
    // Initialize Select2 for the regions multi-select
    $('.select2-multi').select2({
        placeholder: "Select regions",
        closeOnSelect: false,
        allowClear: true
    });
    
    // Function to validate the form and enable/disable the submit button
    function validateForm() {
        const regions = $('#regions').val();
        const proj = $('#proj').val();
        const shockSize = $('#shockSize').val();
        
        // Check if required fields are filled
        if (regions && regions.length > 0 && proj && shockSize !== '') {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }
    
    // Add event listeners for validation
    $('#proj').on('input', validateForm);
    $('#shockSize').on('input', validateForm);
    $('#regions').on('change', validateForm);
    
    // Also validate on page load
    validateForm();
    
    // Function to check for results and display them
    async function checkForResults(runId) {
        if (!runId) return;
        
        console.log("Checking for results for run ID:", runId);
        
        // Create or find a container for results
        let resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'resultsContainer';
            resultsContainer.className = 'mt-4';
            document.getElementById('runDetails').appendChild(resultsContainer);
        }
        
        // GitHub repository information
        const repoOwner = "reza-nia";
        const repoName = "miragrodep-3";
        
        // URLs for GitHub resources
        const actionsUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}`;
        const artifactUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}/artifacts`;
        
        // Show initial results info
        resultsContainer.innerHTML = `
            <div class="card mt-3">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Result Files</h5>
                </div>
                <div class="card-body">
                    <p>Your model results will be available when the run completes.</p>
                    <p class="text-muted">Results are usually ready 10-15 minutes after the run starts.</p>
                    
                    <hr class="my-3">
                    
                    <div class="d-grid gap-2">
                        <a href="${actionsUrl}" target="_blank" class="btn btn-outline-primary">
                            <i class="bi bi-github"></i> Check Run Status on GitHub
                        </a>
                        <a href="${artifactUrl}" target="_blank" class="btn btn-outline-secondary">
                            <i class="bi bi-download"></i> Access Run Artifacts on GitHub
                        </a>
                    </div>
                    
                    <div id="dropboxLinks" class="mt-3">
                        <!-- Dropbox links will appear here when available -->
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i> Public download links via Dropbox will appear here after the run completes.
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Set up a periodic check for Dropbox results
        // This would ideally connect to an API endpoint that can check for the result links
        
        // For now, we'll just show a message about where to find results
        const dropboxLinksContainer = document.getElementById('dropboxLinks');
        if (dropboxLinksContainer) {
            setTimeout(() => {
                dropboxLinksContainer.innerHTML = `
                    <div class="alert alert-info">
                        <p><i class="bi bi-info-circle"></i> <strong>When your run completes:</strong></p>
                        <p>The results will be automatically uploaded to Dropbox, and public download links will be created.</p>
                        <p>These links will be accessible through:</p>
                        <ul>
                            <li>The GitHub Actions page for your run</li>
                            <li>In the "result-links" artifact that appears after completion</li>
                        </ul>
                        <p class="mb-0">You do not need a GitHub account to access these links once they are generated.</p>
                    </div>
                `;
            }, 30000); // Show this message after 30 seconds
        }
    }
    
    // The API endpoint - using relative path for Netlify functions
    const API_URL = '/.netlify/functions/trigger-workflow';
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading overlay with initial message
        loadingOverlay.classList.remove('d-none');
        document.querySelector('.loading-text').textContent = "Starting model run...";
        errorAlert.classList.add('d-none');
        resultCard.classList.add('d-none'); // Hide any previous result card
        
        // Collect form data
        const formData = new FormData(form);
        
        // Handle the regions array specially (Select2 multi-select)
        const selectedRegions = $('#regions').val();
        
        // Convert FormData to an object
        const inputsObj = {};
        for (const [key, value] of formData.entries()) {
            // Skip regions[] entries as we'll handle them separately
            if (key !== 'regions[]') {
                inputsObj[key] = value;
            }
        }
        
        // Add the regions array
        inputsObj.regions = selectedRegions;
        
        // Extract email for notifications
        const email = inputsObj.email;
        delete inputsObj.email;
        
        // Save email locally if provided
        if (email) {
            localStorage.setItem('modelRunnerEmail', email);
        }
        
        try {
            // Call the Netlify function
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: inputsObj,
                    email: email
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Response from server:", data);
            
            // Update loading message to indicate initialization phase
            document.querySelector('.loading-text').textContent = "Initializing GitHub workflow (Please wait, this may take up to a minute)...";
            
            // Add delay before attempting to fetch run information
            await new Promise(resolve => setTimeout(resolve, 9000)); // 9 second delay
            
            document.querySelector('.loading-text').textContent = "Retrieving workflow status...";
            
            // Hide loading and show success
            loadingOverlay.classList.add('d-none');
            resultCard.classList.remove('d-none');
            
            if (data.run && data.run.id) {
                // Format the status display based on run status
                const statusClass = data.run.status === "completed" ? "success" : 
                               (data.run.status === "in_progress" || data.run.status === "queued") ? "info" : "warning";
                
                statusMessage.innerHTML = `
                    <div class="alert alert-${statusClass}">
                        <p><strong>Model run started successfully!</strong></p>
                        <p><strong>Status:</strong> ${data.run.status || "Pending"}</p>
                    </div>
                `;
                
                runDetails.innerHTML = `
                    <p><strong>Run ID:</strong> ${data.run.id}</p>
                    <p><strong>Started at:</strong> ${new Date(data.run.created_at).toLocaleString()}</p>
                    <div class="run-link mb-3">
                        <a href="${data.run.html_url}" target="_blank" class="btn btn-outline-primary">
                            <i class="bi bi-github"></i> View Run on GitHub
                        </a>
                    </div>
                `;
                
                // Check for results after displaying run details
                checkForResults(data.run.id);
                
            } else {
                // If no run info yet, provide direct link to Actions page
                const repoOwner = "reza-nia";
                const repoName = "miragrodep-3";
                const actionsUrl = `https://github.com/${repoOwner}/${repoName}/actions`;
                
                statusMessage.innerHTML = `
                    <div class="alert alert-info">
                        <p><strong>Workflow triggered successfully!</strong></p>
                        <p>Your model run has been started.</p>
                    </div>
                `;
                
                runDetails.innerHTML = `
                    <p>Run details are not yet available. This is normal when a workflow is just starting.</p>
                    <div class="run-link mt-3">
                        <a href="${actionsUrl}" target="_blank" class="btn btn-outline-primary">
                            <i class="bi bi-github"></i> View All Runs on GitHub Actions
                        </a>
                    </div>
                `;
            }
            
        } catch (err) {
            // Handle errors
            loadingOverlay.classList.add('d-none');
            errorAlert.classList.remove('d-none');
            errorMessage.textContent = err.message || "Unknown error occurred";
            console.error('Error starting workflow:', err);
        }
    });
    
    // Restore email from localStorage if it exists
    const savedEmail = localStorage.getItem('modelRunnerEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
    }

    // Check URL for a runId parameter
    const urlParams = new URLSearchParams(window.location.search);
    const runIdFromUrl = urlParams.get('runId');
    
    // If there's a runId in the URL, display its status and check for results
    if (runIdFromUrl) {
        const repoOwner = "reza-nia";
        const repoName = "miragrodep-3";
        const runUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runIdFromUrl}`;
        
        // Hide the form and show run information
        document.getElementById('formContainer').classList.add('d-none');
        resultCard.classList.remove('d-none');
        
        statusMessage.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Viewing results for Run #${runIdFromUrl}</strong></p>
            </div>
        `;
        
        runDetails.innerHTML = `
            <p><strong>Run ID:</strong> ${runIdFromUrl}</p>
            <div class="run-link mb-3">
                <a href="${runUrl}" target="_blank" class="btn btn-outline-primary">
                    <i class="bi bi-github"></i> View Run on GitHub
                </a>
            </div>
        `;
        
        // Check for results for this run
        checkForResults(runIdFromUrl);
    }
});