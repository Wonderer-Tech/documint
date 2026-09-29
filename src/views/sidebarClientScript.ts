export const SIDEBAR_CLIENT_SCRIPT = String.raw`
(function() {
  'use strict';
  var vscode = acquireVsCodeApi();

  var state = {
    isGenerating: false,
  };

  var $ = function(id) { return document.getElementById(id); };

  var statusDot    = $('statusDot');
  var statusText   = $('statusText');
  var authSection  = $('authSection');
  var authStatus   = $('authStatus');
  var authText     = $('authText');
  var authIcon     = $('authIcon');
  var providerSection = $('providerSection');
  var generationModeSel = $('generationMode');
  var localModeHelp = $('localModeHelp');
  var depthField = $('depthField');
  var providerSel  = $('provider');
  var modelInput   = $('model');
  var customEndpointField = $('customEndpointField');
  var customEndpointInput = $('customApiEndpoint');
  var generateBtn  = $('generateBtn');
  var generateBtnText = $('generateBtnText');
  var cancelBtn    = $('cancelBtn');
  var clearCacheBtn = $('clearCacheBtn');
  var configureBtn = $('configureBtn');
  var progressSec  = $('progressSection');
  var progressFill = $('progressFill');
  var progressPct  = $('progressPct');
  var progressFile = $('progressFile');
  var progressFiles= $('progressFiles');
  var progressPhase= $('progressPhase');
  var logSection   = $('logSection');
  var logContainer = $('logContainer');
  var logClear     = $('logClear');
  var apiKeyPanel  = $('apiKeyPanel');
  var apiKeyInput  = $('apiKeyInput');
  var saveApiKeyBtn = $('saveApiKeyBtn');
  var cancelApiKeyBtn = $('cancelApiKeyBtn');
  var apiKeyFeedback = $('apiKeyFeedback');

  function isLocalMode() {
    return generationModeSel && generationModeSel.value === 'local';
  }

  function updateActionAvailability() {
    generateBtn.disabled = state.isGenerating;
    document.querySelectorAll('.scope-btn').forEach(function(btn) {
      btn.disabled = state.isGenerating;
    });
  }

  function updateGenerationModeVisibility() {
    var local = isLocalMode();
    authSection.classList.toggle('hidden', local);
    providerSection.classList.toggle('hidden', local);
    depthField.classList.toggle('hidden', local);
    localModeHelp.classList.toggle('hidden', !local);
    generateBtnText.textContent = local
      ? 'Generate Local Documentation'
      : 'Generate Documentation';
    if (local) setApiKeyPanelVisible(false);
    updateCustomEndpointVisibility();
    updateActionAvailability();
  }

  function setApiKeyStatus(configured, provider) {
    var selectedProvider = provider || providerSel.value;
    if (configured) {
      authStatus.className = 'auth-status ok';
      authText.textContent = 'API Key configured';
      authIcon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    } else if (selectedProvider === 'custom') {
      authStatus.className = 'auth-status optional';
      authText.textContent = 'API Key optional';
      authIcon.innerHTML = '<path d="M7 14a5 5 0 1 1 3.9 4.9L8 22H5v-3H2v-3l5.1-5.1A5 5 0 0 1 7 14z"/>';
    } else {
      authStatus.className = 'auth-status missing';
      authText.textContent = 'API Key not configured';
      authIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
    }
  }

  function showApiKeyFeedback(message, ok) {
    apiKeyFeedback.textContent = message || '';
    apiKeyFeedback.className = 'api-key-feedback visible ' + (ok ? 'ok' : 'error');
  }

  function setApiKeyPanelVisible(visible) {
    apiKeyPanel.classList.toggle('visible', visible);
    if (visible) {
      apiKeyFeedback.className = 'api-key-feedback';
      apiKeyFeedback.textContent = '';
      setTimeout(function() { apiKeyInput.focus(); }, 0);
    } else {
      apiKeyInput.value = '';
      apiKeyFeedback.className = 'api-key-feedback';
      apiKeyFeedback.textContent = '';
    }
  }

  function setStatus(mode, text) {
    statusDot.className = 'status-dot' + (mode ? ' ' + mode : '');
    statusText.textContent = text;
  }

  function setGenerating(on) {
    state.isGenerating = on;
    updateActionAvailability();
    cancelBtn.disabled = !on;
    clearCacheBtn.disabled = on;
    progressSec.classList.toggle('visible', on);
    if (on) {
      setStatus('running', 'Generating…');
    } else {
      setStatus('', 'Ready');
      progressFill.style.width = '0%';
      progressPct.textContent = '0%';
      progressFile.textContent = '';
      progressPhase.textContent = 'Initializing…';
    }
  }

  function addLog(message, type, ts) {
    logSection.hidden = false;
    var entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML =
      '<span class="log-ts">' + (ts || new Date().toLocaleTimeString()) + '</span>' +
      '<span class="log-' + (type || 'info') + '">' + escHtml(message) + '</span>';
    logContainer.appendChild(entry);
    logSection.scrollTop = logSection.scrollHeight;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getCustomEndpoint() {
    return customEndpointInput ? customEndpointInput.value.trim() : '';
  }

  function updateCustomEndpointVisibility() {
    if (!customEndpointField) return;
    customEndpointField.classList.toggle(
      'hidden',
      isLocalMode() || providerSel.value !== 'custom'
    );
  }

  function applyNormalizedSettings(settings) {
    if (!settings) return;
    if (settings.generationMode) generationModeSel.value = settings.generationMode;
    if (settings.provider) providerSel.value = settings.provider;
    if (settings.model) modelInput.value = settings.model;
    if (typeof settings.customApiEndpoint === 'string') customEndpointInput.value = settings.customApiEndpoint;
    if (settings.depth) $('depth').value = settings.depth;
    if (settings.outputFormat) $('outputFormat').value = settings.outputFormat;
    updateGenerationModeVisibility();
  }

  function validateCustomEndpointForRun() {
    if (isLocalMode() || providerSel.value !== 'custom') return true;

    var endpoint = getCustomEndpoint();
    if (!endpoint) {
      addLog('Custom Endpoint URL is required for the custom provider.', 'error');
      setStatus('error', 'Missing custom endpoint');
      return false;
    }

    try {
      var parsed = new URL(endpoint);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch (err) {
      addLog('Custom Endpoint URL must be a valid http or https URL.', 'error');
      setStatus('error', 'Invalid custom endpoint');
      return false;
    }

    return true;
  }

  generationModeSel.addEventListener('change', function() {
    updateGenerationModeVisibility();
    vscode.postMessage({
      type: 'update-settings',
      payload: { generationMode: generationModeSel.value }
    });
  });

  providerSel.addEventListener('change', function() {
    updateCustomEndpointVisibility();
    vscode.postMessage({
      type: 'update-settings',
      payload: {
        provider: providerSel.value,
        model: modelInput.value.trim(),
        customApiEndpoint: getCustomEndpoint()
      }
    });
  });

  modelInput.addEventListener('change', function() {
    vscode.postMessage({ type: 'update-settings', payload: { model: modelInput.value.trim() } });
  });

  customEndpointInput.addEventListener('change', function() {
    vscode.postMessage({ type: 'update-settings', payload: { customApiEndpoint: getCustomEndpoint() } });
  });

  generateBtn.addEventListener('click', function() {
    if (!validateCustomEndpointForRun()) return;
    var payload = {
      generationMode: generationModeSel.value,
      provider: providerSel.value,
      model: modelInput.value.trim(),
      customApiEndpoint: getCustomEndpoint(),
      depth: $('depth').value,
      outputFormat: $('outputFormat').value,
      scope: 'workspace',
    };
    vscode.postMessage({ type: 'generate-documentation', payload: payload });
    setGenerating(true);
  });

  cancelBtn.addEventListener('click', function() {
    vscode.postMessage({ type: 'cancel-generation' });
  });

  clearCacheBtn.addEventListener('click', function() {
    vscode.postMessage({ type: 'clear-cache' });
  });

  configureBtn.addEventListener('click', function() {
    setApiKeyPanelVisible(!apiKeyPanel.classList.contains('visible'));
  });

  saveApiKeyBtn.addEventListener('click', function() {
    var apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showApiKeyFeedback('API key cannot be empty.', false);
      return;
    }
    saveApiKeyBtn.disabled = true;
    showApiKeyFeedback('Saving key...', true);
    vscode.postMessage({ type: 'save-api-key', provider: providerSel.value, apiKey: apiKey });
  });

  cancelApiKeyBtn.addEventListener('click', function() {
    setApiKeyPanelVisible(false);
  });

  apiKeyInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveApiKeyBtn.click();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setApiKeyPanelVisible(false);
    }
  });

  document.querySelectorAll('.scope-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var scope = btn.getAttribute('data-scope');
      var payload = {
        generationMode: generationModeSel.value,
        provider: providerSel.value,
        model: modelInput.value.trim(),
        customApiEndpoint: getCustomEndpoint(),
        depth: $('depth').value,
        outputFormat: $('outputFormat').value,
      };
      if (!validateCustomEndpointForRun()) return;
      if (scope === 'current-file') {
        vscode.postMessage({ type: 'pick-file', payload: payload });
      } else if (scope === 'folder') {
        vscode.postMessage({ type: 'pick-folder', payload: payload });
      } else {
        vscode.postMessage({ type: 'generate-documentation', payload: Object.assign({}, payload, { scope: 'workspace' }) });
        setGenerating(true);
      }
    });
  });

  ['depth','outputFormat'].forEach(function(id) {
    $(id).addEventListener('change', function() {
      var payload = {};
      payload[id] = this.value;
      vscode.postMessage({ type: 'update-settings', payload: payload });
    });
  });

  logClear.addEventListener('click', function() {
    logContainer.innerHTML = '';
    logSection.hidden = true;
  });

  window.addEventListener('message', function(event) {
    var msg = event.data;
    switch (msg.type) {

      case 'restore-state':
        if (!msg.state) break;
        var s = msg.state;
        if (s.settings) {
          applyNormalizedSettings(s.settings);
        }
        setApiKeyStatus(s.apiKeyConfigured, s.settings && s.settings.provider);
        if (s.isGenerating) setGenerating(true);
        if (s.logs && s.logs.length) {
          s.logs.forEach(function(l) { addLog(l.message, l.type, l.timestamp); });
        }
        break;

      case 'settings-normalized':
        applyNormalizedSettings(msg.settings);
        break;

      case 'api-key-status':
        setApiKeyStatus(msg.configured, msg.provider);
        break;

      case 'show-api-key-form':
        if (!isLocalMode()) setApiKeyPanelVisible(true);
        break;

      case 'api-key-save-result':
        saveApiKeyBtn.disabled = false;
        showApiKeyFeedback(msg.message || (msg.ok ? 'API key saved.' : 'Could not save API key.'), !!msg.ok);
        if (msg.ok) {
          apiKeyInput.value = '';
          setTimeout(function() { setApiKeyPanelVisible(false); }, 900);
        }
        break;

      case 'progress':
        progressFill.style.width = (msg.percentage || 0) + '%';
        progressPct.textContent = Math.round(msg.percentage || 0) + '%';
        if (msg.message) progressPhase.textContent = msg.message;
        if (msg.currentFile) progressFile.textContent = msg.currentFile;
        if (msg.totalFiles != null) {
          progressFiles.textContent = (msg.processedFiles || 0) + ' / ' + msg.totalFiles + ' files';
        }
        break;

      case 'log':
        addLog(msg.message, msg.logType, msg.timestamp);
        break;

      case 'generating-state':
        setGenerating(msg.generating);
        break;

      case 'complete':
        setGenerating(false);
        setStatus('', 'Complete');
        break;

      case 'error':
        setGenerating(false);
        setStatus('error', 'Error');
        if (msg.message) addLog(msg.message, 'error');
        break;
    }
  });

  vscode.postMessage({ type: 'ready' });

})();
`;
