/**
 * Browser AI Demo - Zero Server Costs
 * 
 * This app runs a Large Language Model entirely in your browser
 * using WebGPU acceleration. No data is sent to any server.
 */

import { pipeline, env } from '@huggingface/transformers';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    // Model - SmolLM2 is well-tested with transformers.js
    model: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    
    // Generation settings - keep it simple
    maxNewTokens: 150,
    temperature: 0.5,
    doSample: true,
};

// Configure environment
env.allowRemoteModels = true;
env.useBrowserCache = true;

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
    statusPanel: document.getElementById('status-panel'),
    statusIcon: document.getElementById('status-icon'),
    statusTitle: document.getElementById('status-title'),
    statusMessage: document.getElementById('status-message'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    hardwareInfo: document.getElementById('hardware-info'),
    chatContainer: document.getElementById('chat-container'),
    chatMessages: document.getElementById('chat-messages'),
    promptInput: document.getElementById('prompt-input'),
    sendBtn: document.getElementById('send-btn'),
    tokenInfo: document.getElementById('token-info'),
    backendInfo: document.getElementById('backend-info'),
    modelName: document.getElementById('model-name'),
};

// ============================================================================
// State
// ============================================================================

let generator = null;
let isGenerating = false;
let backend = 'unknown';
let downloadedBytes = 0;
let totalBytes = 0;
let fileProgress = {};

// ============================================================================
// UI Helpers
// ============================================================================

function updateStatus(title, message, type = 'loading') {
    elements.statusTitle.textContent = title;
    elements.statusMessage.textContent = message;
    
    elements.statusIcon.className = 'status-icon';
    if (type === 'ready') {
        elements.statusIcon.classList.add('ready');
        elements.statusIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
        `;
    } else if (type === 'error') {
        elements.statusIcon.classList.add('error');
        elements.statusIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
        `;
    } else {
        elements.statusIcon.innerHTML = `
            <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="62.83" stroke-dashoffset="15"/>
            </svg>
        `;
    }
}

function updateProgress(percent, details = '') {
    elements.progressContainer.style.display = 'block';
    elements.progressFill.style.width = `${Math.min(100, percent)}%`;
    elements.progressText.textContent = details || `${Math.round(percent)}%`;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function addMessage(content, role) {
    // Remove welcome message if present
    const welcome = elements.chatMessages.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    return contentDiv;
}

function addThinkingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-assistant';
    messageDiv.id = 'thinking-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content thinking-content';
    contentDiv.innerHTML = `
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
    `;
    
    messageDiv.appendChild(contentDiv);
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    return messageDiv;
}

function removeThinkingMessage() {
    const thinking = document.getElementById('thinking-message');
    if (thinking) thinking.remove();
}

// ============================================================================
// WebGPU Detection
// ============================================================================

async function checkWebGPU() {
    if (!navigator.gpu) {
        return { supported: false, reason: 'WebGPU API not available in this browser' };
    }
    
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            return { supported: false, reason: 'No WebGPU adapter found (GPU may not support it)' };
        }
        
        // Get adapter info - API changed: now it's adapter.info (not requestAdapterInfo())
        let info = {};
        if (adapter.info) {
            // New API (Chrome 121+)
            info = adapter.info;
        } else if (typeof adapter.requestAdapterInfo === 'function') {
            // Old API (fallback)
            info = await adapter.requestAdapterInfo();
        }
        
        return {
            supported: true,
            adapter,
            info: {
                vendor: info.vendor || 'Unknown',
                architecture: info.architecture || 'Unknown',
                device: info.device || 'Unknown',
                description: info.description || info.vendor || 'WebGPU Ready'
            }
        };
    } catch (e) {
        return { supported: false, reason: e.message };
    }
}

// ============================================================================
// Model Loading
// ============================================================================

async function loadModel() {
    const webgpuCheck = await checkWebGPU();
    
    // Force WASM for now - WebGPU has issues with some models
    let deviceType = 'wasm';
    backend = 'wasm';
    
    if (webgpuCheck.supported) {
        elements.hardwareInfo.innerHTML = `
            <strong>GPU Available:</strong> ${webgpuCheck.info.description || webgpuCheck.info.vendor}<br>
            <strong>Backend:</strong> WASM (CPU) — Using CPU for stability
        `;
    } else {
        elements.hardwareInfo.innerHTML = `
            <strong>Backend:</strong> WASM (CPU)
        `;
    }
    
    elements.backendInfo.textContent = backend.toUpperCase();
    
    updateStatus('Downloading Model', 'Preparing to download...');
    updateProgress(0, 'Starting...');
    
    try {
        // Track download progress - simplified for accuracy
        const progressCallback = (progress) => {
            console.log('Progress:', progress); // Debug
            
            if (progress.status === 'progress' && progress.progress !== undefined) {
                // Use the progress percentage directly from the event
                const fileName = progress.file?.split('/').pop() || 'model';
                const percent = progress.progress;
                
                // Show loaded/total if available
                let details = `${Math.round(percent)}%`;
                if (progress.loaded && progress.total) {
                    details = `${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`;
                }
                
                updateProgress(percent, details);
                updateStatus('Downloading Model', fileName);
            } else if (progress.status === 'download') {
                const fileName = progress.file?.split('/').pop() || 'files';
                updateStatus('Downloading Model', `Starting ${fileName}...`);
            } else if (progress.status === 'done') {
                const fileName = progress.file?.split('/').pop() || 'file';
                updateStatus('Processing', `Downloaded ${fileName}`);
            } else if (progress.status === 'init' || progress.status === 'ready') {
                updateProgress(100, 'Initializing...');
                updateStatus('Loading Model', 'Initializing inference engine...');
            }
        };
        
        // Create the text generation pipeline
        // Use q8 (8-bit quantization) - compatible and reasonably small
        generator = await pipeline('text-generation', CONFIG.model, {
            dtype: 'q8',  // 8-bit quantization - good balance of size/compatibility
            device: deviceType,
            progress_callback: progressCallback,
        });
        
        elements.modelName.textContent = CONFIG.model.split('/').pop();
        
        return true;
    } catch (error) {
        console.error('Model loading error:', error);
        
        // If WebGPU failed, try falling back to WASM
        if (deviceType === 'webgpu') {
            console.log('WebGPU failed, falling back to WASM...');
            backend = 'wasm';
            elements.backendInfo.textContent = 'WASM';
            elements.hardwareInfo.innerHTML = `
                <strong>⚠️ WebGPU failed:</strong> ${error.message}<br>
                <strong>Backend:</strong> WASM (CPU fallback)
            `;
            
            try {
                generator = await pipeline('text-generation', CONFIG.model, {
                    dtype: 'q8',
                    device: 'wasm',
                    progress_callback: (p) => {
                        if (p.status === 'progress' && p.total) {
                            updateProgress((p.loaded / p.total) * 100);
                        }
                    },
                });
                elements.modelName.textContent = CONFIG.model.split('/').pop();
                return true;
            } catch (fallbackError) {
                updateStatus('Error Loading Model', fallbackError.message, 'error');
                return false;
            }
        }
        
        updateStatus('Error Loading Model', error.message, 'error');
        return false;
    }
}

// ============================================================================
// Text Generation
// ============================================================================

async function generateResponse(prompt) {
    if (!generator || isGenerating) return;
    
    isGenerating = true;
    elements.sendBtn.disabled = true;
    elements.tokenInfo.textContent = 'Generating...';
    
    // Show thinking animation
    addThinkingMessage();
    
    // IMPORTANT: Give browser time to render UI updates before heavy computation
    await new Promise(resolve => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
    }));
    
    const startTime = performance.now();
    
    try {
        console.log('Starting generation with prompt:', prompt);
        
        // Use SmolLM2 chat format
        const messages = [
            { role: 'user', content: prompt }
        ];
        
        console.log('Calling generator with messages:', messages);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Generation timed out after 60s')), 60000);
        });
        
        // Race between generation and timeout
        const output = await Promise.race([
            generator(messages, {
                max_new_tokens: CONFIG.maxNewTokens,
                do_sample: false,  // Greedy decoding for stability
            }),
            timeoutPromise
        ]);
        
        console.log('Generation complete:', output);
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        
        // Remove thinking animation
        removeThinkingMessage();
        
        // Extract response from chat format
        let responseText = '';
        if (output && output[0]) {
            const generated = output[0].generated_text;
            console.log('Generated text:', generated);
            
            if (Array.isArray(generated)) {
                // Chat format returns array of messages
                const assistantMsg = generated.find(m => m.role === 'assistant');
                responseText = assistantMsg?.content || '';
            } else if (typeof generated === 'string') {
                responseText = generated;
            }
        }
        
        // Clean up response
        responseText = responseText
            .replace(/<\|[^|]+\|>/g, '')
            .trim();
        
        // Display response
        addMessage(responseText || 'No response generated.', 'assistant');
        
        // Calculate stats
        const tokenCount = Math.ceil(responseText.length / 4);
        const tokensPerSec = duration > 0 ? (tokenCount / parseFloat(duration)).toFixed(1) : '0';
        elements.tokenInfo.textContent = `${duration}s • ~${tokenCount} tokens • ${tokensPerSec} tok/s • ${backend.toUpperCase()}`;
        
    } catch (error) {
        console.error('Generation error:', error);
        removeThinkingMessage();
        addMessage(`Error: ${error.message}`, 'assistant');
        elements.tokenInfo.textContent = 'Error';
    } finally {
        isGenerating = false;
        elements.sendBtn.disabled = false;
    }
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventListeners() {
    // Send button
    elements.sendBtn.addEventListener('click', () => {
        const prompt = elements.promptInput.value.trim();
        if (prompt) {
            addMessage(prompt, 'user');
            elements.promptInput.value = '';
            elements.promptInput.style.height = 'auto';
            generateResponse(prompt);
        }
    });
    
    // Enter to send (Shift+Enter for new line)
    elements.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.sendBtn.click();
        }
    });
    
    // Auto-resize textarea
    elements.promptInput.addEventListener('input', () => {
        elements.promptInput.style.height = 'auto';
        elements.promptInput.style.height = Math.min(elements.promptInput.scrollHeight, 150) + 'px';
    });
    
    // Example prompts
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            elements.promptInput.value = prompt;
            elements.sendBtn.click();
        });
    });
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
    updateStatus('Initializing', 'Checking browser capabilities...');
    
    const success = await loadModel();
    
    if (success) {
        updateStatus('Ready!', 'Model loaded successfully. Start chatting!', 'ready');
        
        // Hide status panel and show chat after a moment
        setTimeout(() => {
            elements.statusPanel.style.display = 'none';
            elements.chatContainer.style.display = 'flex';
            elements.sendBtn.disabled = false;
            elements.promptInput.focus();
        }, 1000);
    }
}

// Start the app
setupEventListeners();
init();
