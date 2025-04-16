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
    
    // The API endpoint - using relative path for Netlify functions
    const API_URL = '/.netlify/functions/trigger-workflow';
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading overlay with initial message
        loadingOverlay.classList.remove('d-none');
        document.querySelector('.loading-text').textContent = "Starting model run...";
        errorAlert.classList.add('d-none');
        
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
            await new Promise(resolve => setTimeout(resolve, 30000)); // 10 second delay
            
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
                    <div class="run-link">
                        <a href="${data.run.html_url}" target="_blank" class="btn btn-outline-primary">
                            View Run on GitHub
                        </a>
                    </div>
                `;
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
                            View All Runs on GitHub Actions
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
});