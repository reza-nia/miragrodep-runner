document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('runModelForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultCard = document.getElementById('resultCard');
    const statusMessage = document.getElementById('statusMessage');
    const runDetails = document.getElementById('runDetails');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    
    // The API endpoint - update this to your Netlify domain
    const API_URL = 'https://your-netlify-app.netlify.app/api/trigger-workflow';
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading overlay
        loadingOverlay.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        
        // Collect form data
        const formData = new FormData(form);
        const inputs = Object.fromEntries(formData.entries());
        
        // Extract email for notifications
        const email = inputs.email;
        delete inputs.email;
        
        try {
            // Call the Netlify function
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: inputs,
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
