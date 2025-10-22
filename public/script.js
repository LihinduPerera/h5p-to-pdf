const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const browseBtn = document.querySelector('.browse-btn');

// Click on browse button or drop zone to trigger file input
browseBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.classList.contains('drop-zone-content')) {
        fileInput.click();
    }
});

// Drag and drop events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('highlight');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('highlight');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('highlight');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.h5p')) {
        handleFileSelection(file);
    } else {
        showStatus('Please drop a valid .h5p file.', 'error');
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileSelection(file);
    }
});

function handleFileSelection(file) {
    // Update UI to show selected file
    const dropZoneContent = dropZone.querySelector('.drop-zone-content');
    dropZoneContent.innerHTML = `
        <i class="fas fa-file-alt upload-icon"></i>
        <h3>${file.name}</h3>
        <p>Ready to convert</p>
        <button class="browse-btn">Change File</button>
    `;
    
    // Re-attach event listeners to the new button
    dropZone.querySelector('.browse-btn').addEventListener('click', () => fileInput.click());
    
    uploadFile(file);
}

function uploadFile(file) {
    showStatus('Uploading and converting...', 'loading');
    
    const formData = new FormData();
    formData.append('h5pFile', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            return response.blob();
        } else {
            throw new Error('Conversion failed. Please check your file and try again.');
        }
    }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.h5p$/, '') + '.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        showStatus('Conversion complete! PDF downloaded.', 'success');
        
        // Reset the drop zone after successful conversion
        setTimeout(() => {
            resetDropZone();
        }, 3000);
    }).catch(err => {
        console.error(err);
        showStatus('Error: ' + err.message, 'error');
        resetDropZone();
    });
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status';
    
    if (type === 'loading') {
        status.classList.add('loading');
    } else if (type === 'success') {
        status.classList.add('success');
    } else if (type === 'error') {
        status.classList.add('error');
    }
}

function resetDropZone() {
    const dropZoneContent = dropZone.querySelector('.drop-zone-content');
    dropZoneContent.innerHTML = `
        <i class="fas fa-cloud-upload-alt upload-icon"></i>
        <h3>Drag & Drop your .h5p file</h3>
        <p>or</p>
        <button class="browse-btn">Browse Files</button>
    `;
    
    // Re-attach event listeners
    dropZone.querySelector('.browse-btn').addEventListener('click', () => fileInput.click());
    
    // Reset file input
    fileInput.value = '';
}