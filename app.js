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
    
    // The API endpoint - update this to your Netlify domain
    const API_URL = 'https://miragrodep-runner.netlify.app/api/trigger-workflow';
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading overlay
        loadingOverlay.classList.remove('d-none');
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
            
            // Hide loading and show success
            loadingOverlay.classList.add('d-none');
            resultCard.classList.remove('d-none');
            
            statusMessage.innerHTML = `
                <p>Model run started successfully!</p>
                <p>Status: <span class="status-pending">Pending</span></p>
            `;
            
            if (data.run) {
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
                runDetails.innerHTML = `
                    <p>Run started successfully, but run details are not available.</p>
                `;
            }
            
            // Save email locally if provided
            if (email) {
                localStorage.setItem('modelRunnerEmail', email);
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