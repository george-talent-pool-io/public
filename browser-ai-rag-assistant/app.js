/**
 * Browser AI RAG Assistant
 * 
 * 100% browser-based Retrieval Augmented Generation
 * - Embedding model for vector search
 * - LLM for answer generation
 * - In-memory vector store
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowRemoteModels = true;
env.useBrowserCache = true;

// Demo documents
const DEMO_DOCUMENTS = {
    tortoise: {
        name: "The Tortoise and the Hare",
        text: `🐢 The Tortoise and the Hare (from Aesop's Fables)

The Story

One sunny day in the forest, a fast and boastful hare was bragging loudly about how quick he was.

"I'm the fastest creature alive!" he laughed. "No one can beat me in a race!"

The other animals grew tired of his constant boasting. Then, quietly, a slow and gentle tortoise spoke up:

"I will race you."

The forest went silent. Then the hare burst into laughter.

"You?" he said. "That's the funniest thing I've ever heard. I could run circles around you before you take three steps!"

But the tortoise simply said, "Let's find out."

So the animals marked a starting line and a finish line. At the signal, the race began.

The hare shot forward like a bolt of lightning and was soon far out of sight. The tortoise, meanwhile, moved slowly and steadily, step by step, never stopping.

After a while, the hare looked back and saw the tortoise far behind.

"You know what?" he said to himself. "I have plenty of time. I'll take a little nap."

So he lay down under a shady tree and quickly fell asleep.

The tortoise passed the sleeping hare. Still walking. Still steady. Never stopping.

Minutes passed. Then hours.

At last, the hare woke up and stretched.

"Oh! I should finish the race now," he said confidently.

He ran as fast as he could toward the finish line — but it was too late.

The tortoise was already crossing the line.

The animals cheered. The hare stood in shock. And the tortoise simply smiled.

The Moral

Slow and steady wins the race.`
    }
};

// ============================================================================
// State
// ============================================================================

let embeddingPipeline = null;
let generationPipeline = null;
let isGenerating = false;

// Vector store: array of { text, embedding, docName, chunkIndex }
let vectorStore = [];
let documents = []; // { name, text, chunks }

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
    modelsPanel: document.getElementById('models-panel'),
    embeddingModelSelect: document.getElementById('embedding-model-select'),
    llmModelSelect: document.getElementById('llm-model-select'),
    embeddingStatus: document.getElementById('embedding-status'),
    llmStatus: document.getElementById('llm-status'),
    reloadModelsBtn: document.getElementById('reload-models-btn'),
    loadingPanel: document.getElementById('loading-panel'),
    loadingIcon: document.getElementById('loading-icon'),
    loadingTitle: document.getElementById('loading-title'),
    loadingMessage: document.getElementById('loading-message'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    documentsSection: document.getElementById('documents-section'),
    embeddingOverlay: document.getElementById('embedding-overlay'),
    embeddingTitle: document.getElementById('embedding-title'),
    embeddingStatusText: document.getElementById('embedding-status-text'),
    embeddingProgressFill: document.getElementById('embedding-progress-fill'),
    embeddingProgressText: document.getElementById('embedding-progress-text'),
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    documentsItems: document.getElementById('documents-items'),
    chunkCount: document.getElementById('chunk-count'),
    clearDocsBtn: document.getElementById('clear-docs-btn'),
    pasteInput: document.getElementById('paste-input'),
    addPasteBtn: document.getElementById('add-paste-btn'),
    chatSection: document.getElementById('chat-section'),
    chatMessages: document.getElementById('chat-messages'),
    promptInput: document.getElementById('prompt-input'),
    sendBtn: document.getElementById('send-btn'),
    statusInfo: document.getElementById('status-info'),
};

// ============================================================================
// Text Chunking
// ============================================================================

function chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            // Keep overlap
            const words = currentChunk.split(' ');
            currentChunk = words.slice(-Math.floor(overlap / 5)).join(' ') + ' ' + sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(c => c.length > 20); // Filter tiny chunks
}

// ============================================================================
// Vector Operations
// ============================================================================

function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findSimilarChunks(queryEmbedding, topK = 3) {
    if (vectorStore.length === 0) return [];
    
    // Filter out items without embeddings and calculate similarity
    const similarities = vectorStore
        .filter(item => item.embedding !== null)
        .map((item, index) => ({
            ...item,
            index,
            similarity: cosineSimilarity(queryEmbedding, item.embedding)
        }));
    
    if (similarities.length === 0) return [];
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, topK);
}

// ============================================================================
// Model Loading
// ============================================================================

function updateProgress(percent, text = null) {
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = text || `${Math.round(percent)}%`;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function loadModels() {
    const embeddingModel = elements.embeddingModelSelect.value;
    const llmModel = elements.llmModelSelect.value;
    
    // Disable selects during loading
    elements.embeddingModelSelect.disabled = true;
    elements.llmModelSelect.disabled = true;
    elements.reloadModelsBtn.style.display = 'none';
    
    // Reset status
    elements.embeddingStatus.textContent = '⏳';
    elements.embeddingStatus.classList.remove('loaded');
    elements.llmStatus.textContent = '⏳';
    elements.llmStatus.classList.remove('loaded');
    
    // Show loading panel, hide main UI
    elements.loadingPanel.style.display = 'block';
    elements.documentsSection.style.display = 'none';
    elements.chatSection.style.display = 'none';
    
    // Reset loading icon
    elements.loadingIcon.className = 'loading-icon';
    elements.loadingIcon.innerHTML = `
        <svg class="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="62.83" stroke-dashoffset="15"/>
        </svg>
    `;
    
    try {
        // Load embedding model
        elements.loadingTitle.textContent = 'Loading Embedding Model';
        elements.loadingMessage.textContent = embeddingModel.split('/').pop();
        updateProgress(0, 'Starting...');
        
        embeddingPipeline = await pipeline('feature-extraction', embeddingModel, {
            dtype: 'fp32',
            device: 'wasm',
            progress_callback: (p) => {
                if (p.status === 'progress' && p.progress !== undefined) {
                    let details = `${Math.round(p.progress)}%`;
                    if (p.loaded && p.total) {
                        details = `${formatBytes(p.loaded)} / ${formatBytes(p.total)}`;
                    }
                    updateProgress(p.progress, details);
                }
            }
        });
        
        elements.embeddingStatus.textContent = '✓';
        elements.embeddingStatus.classList.add('loaded');
        
        // Load LLM
        elements.loadingTitle.textContent = 'Loading LLM';
        elements.loadingMessage.textContent = llmModel.split('/').pop();
        updateProgress(0, 'Starting...');
        
        generationPipeline = await pipeline('text-generation', llmModel, {
            dtype: 'q8',
            device: 'wasm',
            progress_callback: (p) => {
                if (p.status === 'progress' && p.progress !== undefined) {
                    let details = `${Math.round(p.progress)}%`;
                    if (p.loaded && p.total) {
                        details = `${formatBytes(p.loaded)} / ${formatBytes(p.total)}`;
                    }
                    updateProgress(p.progress, details);
                }
            }
        });
        
        elements.llmStatus.textContent = '✓';
        elements.llmStatus.classList.add('loaded');
        
        // Show ready state
        elements.loadingTitle.textContent = 'Ready!';
        elements.loadingMessage.textContent = 'Models loaded successfully';
        updateProgress(100, 'Complete');
        
        // Update icon to success
        elements.loadingIcon.classList.add('ready');
        elements.loadingIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
        `;
        
        // After a moment, show the main UI
        setTimeout(() => {
            elements.loadingPanel.style.display = 'none';
            elements.documentsSection.style.display = 'grid';
            elements.chatSection.style.display = 'flex';
            elements.promptInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.embeddingModelSelect.disabled = false;
            elements.llmModelSelect.disabled = false;
            elements.reloadModelsBtn.style.display = 'block';
            elements.statusInfo.textContent = 'Ready — Upload documents and ask questions';
        }, 1000);
        
    } catch (error) {
        console.error('Error loading models:', error);
        elements.loadingTitle.textContent = 'Error Loading Models';
        elements.loadingMessage.textContent = error.message;
        elements.loadingIcon.classList.add('error');
        elements.loadingIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
        `;
        elements.embeddingModelSelect.disabled = false;
        elements.llmModelSelect.disabled = false;
        elements.reloadModelsBtn.style.display = 'block';
    }
}

// ============================================================================
// Document Processing
// ============================================================================

async function processDocument(name, text, sourceType = 'file') {
    const chunks = chunkText(text);
    
    if (chunks.length === 0) {
        alert('No valid text found in document');
        return;
    }
    
    // Store document with source type for icon display
    const doc = { name, text, chunks, sourceType };
    documents.push(doc);
    
    // Embed chunks in small batches (balance speed vs memory)
    if (embeddingPipeline) {
        const BATCH_SIZE = 4; // Process 4 chunks at a time (safe)
        const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
        
        // Show embedding overlay
        elements.embeddingOverlay.style.display = 'flex';
        elements.embeddingTitle.textContent = `Embedding "${name}"`;
        elements.embeddingProgressFill.style.width = '0%';
        elements.embeddingProgressText.textContent = '0%';
        
        for (let b = 0; b < totalBatches; b++) {
            const start = b * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, chunks.length);
            const batchChunks = chunks.slice(start, end);
            
            // Update progress
            const progress = Math.round((end / chunks.length) * 100);
            elements.embeddingStatusText.textContent = `Processing chunks ${start + 1}-${end} of ${chunks.length}`;
            elements.embeddingProgressFill.style.width = `${progress}%`;
            elements.embeddingProgressText.textContent = `${progress}%`;
            elements.statusInfo.textContent = `Embedding ${end}/${chunks.length} chunks...`;
            
            // Give UI time to update
            await new Promise(r => setTimeout(r, 10));
            
            // Process batch
            const output = await embeddingPipeline(batchChunks, { pooling: 'mean', normalize: true });
            
            // Extract embeddings
            const embeddingSize = output.dims[1];
            
            for (let i = 0; i < batchChunks.length; i++) {
                const embStart = i * embeddingSize;
                const embedding = Array.from(output.data.slice(embStart, embStart + embeddingSize));
                
                vectorStore.push({
                    text: batchChunks[i],
                    embedding,
                    docName: name,
                    chunkIndex: start + i
                });
            }
        }
        
        // Hide overlay
        elements.embeddingOverlay.style.display = 'none';
        elements.statusInfo.textContent = 'Ready — Ask questions about your documents';
    } else {
        // Just store chunks without embeddings
        for (let i = 0; i < chunks.length; i++) {
            vectorStore.push({
                text: chunks[i],
                embedding: null,
                docName: name,
                chunkIndex: i
            });
        }
    }
    
    updateDocumentsList();
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += pageText + '\n\n';
    }
    
    return text;
}

async function handleFileUpload(files) {
    if (!embeddingPipeline) {
        alert('Please wait for models to load before uploading documents.');
        return;
    }
    
    for (const file of files) {
        let text = '';
        const fileName = file.name.toLowerCase();
        
        console.log('Processing file:', file.name, 'Type:', file.type);
        
        if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
            try {
                text = await extractTextFromPDF(file);
            } catch (e) {
                console.error('PDF parsing error:', e);
                alert(`Error parsing PDF: ${file.name}`);
                continue;
            }
        } else if (fileName.endsWith('.txt') || fileName.endsWith('.md') || 
                   file.type === 'text/plain' || file.type === 'text/markdown' ||
                   file.type === '') {
            // Handle text files including .md files (which often have empty type)
            try {
                text = await file.text();
            } catch (e) {
                console.error('Text file error:', e);
                alert(`Error reading file: ${file.name}`);
                continue;
            }
        } else {
            // Try to read as text anyway
            try {
                text = await file.text();
            } catch (e) {
                alert(`Unsupported file type: ${file.name}`);
                continue;
            }
        }
        
        if (text && text.trim()) {
            // Get file extension for source type
            const ext = file.name.split('.').pop().toLowerCase();
            await processDocument(file.name, text, ext);
        } else {
            alert(`No text found in: ${file.name}`);
        }
    }
}

function getDocumentIcon(doc) {
    // If it's pasted text, use clipboard icon
    if (doc.sourceType === 'clipboard') {
        return '📋';
    }
    // Get icon based on file extension from sourceType or filename
    const ext = doc.sourceType || doc.name.split('.').pop().toLowerCase();
    switch (ext) {
        case 'pdf': return '📕';
        case 'md': return '📝';
        case 'txt': return '📄';
        case 'json': return '📊';
        case 'csv': return '📊';
        default: return '📄';
    }
}

function updateDocumentsList() {
    elements.documentsItems.innerHTML = '';
    
    documents.forEach((doc, index) => {
        const icon = getDocumentIcon(doc);
        const div = document.createElement('div');
        div.className = 'doc-item';
        div.innerHTML = `
            <span class="doc-icon">${icon}</span>
            <span class="doc-name">${doc.name}</span>
            <span class="doc-chunks">${doc.chunks.length} chunks</span>
            <button class="doc-remove" data-index="${index}">×</button>
        `;
        elements.documentsItems.appendChild(div);
    });
    
    const totalChunks = vectorStore.length;
    elements.chunkCount.textContent = `${totalChunks} chunks`;
    elements.clearDocsBtn.style.display = documents.length > 0 ? 'block' : 'none';
}

function removeDocument(index) {
    const doc = documents[index];
    
    // Remove from vector store
    vectorStore = vectorStore.filter(item => item.docName !== doc.name);
    
    // Remove from documents
    documents.splice(index, 1);
    
    updateDocumentsList();
}

function clearAllDocuments() {
    documents = [];
    vectorStore = [];
    updateDocumentsList();
}

// ============================================================================
// Chat / RAG
// ============================================================================

function addMessage(content, role, sources = null) {
    // Remove welcome message
    const welcome = elements.chatMessages.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    
    const div = document.createElement('div');
    div.className = `message message-${role}`;
    
    let html = `<div class="message-content">${escapeHtml(content)}`;
    
    if (sources && sources.length > 0) {
        // Simple inline source attribution
        const sourceNames = [...new Set(sources.map(s => s.docName))].join(', ');
        html += `<div class="message-source-hint">From: ${sourceNames}</div>`;
    }
    
    html += '</div>';
    div.innerHTML = html;
    
    elements.chatMessages.appendChild(div);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    return div;
}

function addThinkingMessage() {
    const div = document.createElement('div');
    div.className = 'message message-assistant';
    div.id = 'thinking-message';
    div.innerHTML = `
        <div class="message-content thinking-content">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
        </div>
    `;
    elements.chatMessages.appendChild(div);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function removeThinkingMessage() {
    const thinking = document.getElementById('thinking-message');
    if (thinking) thinking.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function generateRAGResponse(question) {
    if (!generationPipeline || isGenerating) return;
    
    if (vectorStore.length === 0) {
        addMessage('Please upload some documents first.', 'assistant');
        return;
    }
    
    isGenerating = true;
    elements.sendBtn.disabled = true;
    elements.statusInfo.textContent = 'Searching documents...';
    
    addThinkingMessage();
    
    // Give UI time to render
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    
    try {
        // Embed the question
        let relevantChunks = [];
        
        if (embeddingPipeline) {
            elements.statusInfo.textContent = 'Embedding question...';
            const queryOutput = await embeddingPipeline(question, { pooling: 'mean', normalize: true });
            const queryEmbedding = Array.from(queryOutput.data);
            
            // Find similar chunks - use only top 2 for small models
            elements.statusInfo.textContent = 'Finding relevant chunks...';
            relevantChunks = findSimilarChunks(queryEmbedding, 2);
        } else {
            // Fallback: just use first chunk
            relevantChunks = vectorStore.slice(0, 1).map(c => ({ ...c, similarity: 0 }));
        }
        
        // Build context - keep it short for small models
        const context = relevantChunks
            .map(c => c.text.substring(0, 300))
            .join('\n');
        
        elements.statusInfo.textContent = 'Generating answer...';
        
        // Use chat format which SmolLM2 is trained for
        const messages = [
            { role: 'user', content: `${context}\n\nAnswer briefly: ${question}` }
        ];
        
        const output = await generationPipeline(messages, {
            max_new_tokens: 80,
            do_sample: false,
        });
        
        removeThinkingMessage();
        
        // Extract response
        let responseText = '';
        if (output && output[0]) {
            const generated = output[0].generated_text;
            if (Array.isArray(generated)) {
                const assistantMsg = generated.find(m => m.role === 'assistant');
                responseText = assistantMsg?.content || '';
            } else {
                responseText = generated || '';
            }
        }
        
        // Clean up artifacts
        responseText = responseText
            .replace(/<\|[^|]+\|>/g, '')
            .replace(/\n{2,}/g, '\n')
            .trim()
            .split('\n')[0]; // Keep only first line for brevity
        
        addMessage(responseText || 'Could not generate a response.', 'assistant', relevantChunks);
        
        elements.statusInfo.textContent = 'Ready';
        
    } catch (error) {
        console.error('RAG error:', error);
        removeThinkingMessage();
        addMessage(`Error: ${error.message}`, 'assistant');
        elements.statusInfo.textContent = 'Error occurred';
    } finally {
        isGenerating = false;
        elements.sendBtn.disabled = false;
    }
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
    // Reload models button
    elements.reloadModelsBtn.addEventListener('click', () => {
        loadModels();
    });
    
    // File upload - click
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    // File upload - file selected
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files);
            e.target.value = ''; // Reset so same file can be uploaded again
        }
    });
    
    // File upload - drag and drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.add('dragover');
    });
    
    elements.uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.remove('dragover');
    });
    
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    });
    
    // Paste text
    elements.addPasteBtn.addEventListener('click', () => {
        if (!embeddingPipeline) {
            alert('Please load the models first before adding documents.');
            return;
        }
        const text = elements.pasteInput.value.trim();
        if (text) {
            // Extract first few words as title (clean up special chars)
            const cleanText = text.replace(/[^\w\s]/g, ' ').trim();
            const words = cleanText.split(/\s+/).filter(w => w).slice(0, 5).join(' ');
            const title = words.length > 30 ? words.substring(0, 30) + '...' : (words || 'Pasted Text');
            processDocument(title, text, 'clipboard');
            elements.pasteInput.value = '';
        }
    });
    
    // Remove document
    elements.documentsItems.addEventListener('click', (e) => {
        if (e.target.classList.contains('doc-remove')) {
            const index = parseInt(e.target.dataset.index);
            removeDocument(index);
        }
    });
    
    // Clear all documents
    elements.clearDocsBtn.addEventListener('click', clearAllDocuments);
    
    // Send message
    elements.sendBtn.addEventListener('click', () => {
        const question = elements.promptInput.value.trim();
        if (question) {
            addMessage(question, 'user');
            elements.promptInput.value = '';
            generateRAGResponse(question);
        }
    });
    
    // Enter to send
    elements.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.sendBtn.click();
        }
    });
    
    // Example prompts
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.promptInput.value = btn.dataset.prompt;
            elements.sendBtn.click();
        });
    });
    
    // Demo document buttons - fill textarea with demo text
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const demoId = btn.dataset.demo;
            const demo = DEMO_DOCUMENTS[demoId];
            if (demo) {
                elements.pasteInput.value = demo.text;
                elements.pasteInput.focus();
            }
        });
    });
}

// ============================================================================
// Initialize
// ============================================================================

// Set PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Hide main UI until models are loaded
elements.documentsSection.style.display = 'none';
elements.chatSection.style.display = 'none';

setupEventListeners();

// Auto-load models on page load
loadModels();

