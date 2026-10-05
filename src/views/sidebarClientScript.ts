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
  var localModelSuggestions = $('localModelSuggestions');
  var localModelStatus = $('localModelStatus');
  var lastLocalModelDiscoveryProvider = '';
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

  var reviewCard = $('reviewCard');
  var reviewStars = $('reviewStars');
  var reviewRatingLabel = $('reviewRatingLabel');
  var reviewMarketplaceBtn = $('reviewMarketplaceBtn');
  var reviewFeedback = $('reviewFeedback');
  var reviewFeedbackBtn = $('reviewFeedbackBtn');
  var reviewFeedbackStatus = $('reviewFeedbackStatus');
  var reviewFeedbackCount = $('reviewFeedbackCount');
  var reviewLaterBtn = $('reviewLaterBtn');
  var reviewNeverBtn = $('reviewNeverBtn');
  var reviewCloseBtn = $('reviewCloseBtn');
  var reviewRating = 0;
  var reviewPromptPresentedSent = false;

  function isLocalMode() {
    return generationModeSel && generationModeSel.value === 'local';
  }

  function isLocalProvider(provider) {
    var selected = provider || (providerSel && providerSel.value);
    return selected === 'ollama' || selected === 'lmstudio';
  }

  function updateModelPlaceholder() {
    if (!modelInput || !providerSel) return;
    if (providerSel.value === 'ollama') {
      modelInput.placeholder = 'e.g. qwen3:8b';
      return;
    }
    if (providerSel.value === 'lmstudio') {
      modelInput.placeholder = 'Enter model ID served by LM Studio';
      return;
    }
    modelInput.placeholder =
      'e.g. gpt-5.4-nano, claude-sonnet-5, anthropic/claude-sonnet-5';
  }

  function clearLocalModelDiscovery() {
    lastLocalModelDiscoveryProvider = '';
    if (localModelSuggestions) localModelSuggestions.innerHTML = '';
    if (localModelStatus) {
      localModelStatus.textContent = '';
      localModelStatus.classList.add('hidden');
    }
  }

  function requestLocalProviderModels() {
    if (
      isLocalMode() ||
      !isLocalProvider() ||
      !providerSel ||
      !localModelStatus
    ) {
      if (!isLocalProvider()) clearLocalModelDiscovery();
      return;
    }

    var provider = providerSel.value;
    if (lastLocalModelDiscoveryProvider === provider) return;
    lastLocalModelDiscoveryProvider = provider;

    if (localModelSuggestions) localModelSuggestions.innerHTML = '';
    localModelStatus.textContent =
      'Looking for models served by ' +
      (provider === 'ollama' ? 'Ollama' : 'LM Studio') +
      '…';
    localModelStatus.classList.remove('hidden');

    vscode.postMessage({
      type: 'discover-local-models',
      provider: provider
    });
  }

  function applyLocalProviderModels(msg) {
    if (
      !msg ||
      !isLocalProvider() ||
      msg.provider !== providerSel.value
    ) {
      return;
    }

    var models = Array.isArray(msg.models)
      ? msg.models.filter(function(model) {
          return typeof model === 'string' && model.trim();
        })
      : [];

    if (localModelSuggestions) {
      localModelSuggestions.innerHTML = '';
      models.forEach(function(model) {
        var option = document.createElement('option');
        option.value = model;
        localModelSuggestions.appendChild(option);
      });
    }

    if (!localModelStatus) return;

    if (msg.error) {
      localModelStatus.textContent =
        'Could not reach the local model server. You can still enter a model ID manually.';
      localModelStatus.classList.remove('hidden');
      return;
    }

    if (!models.length) {
      localModelStatus.textContent =
        'No models reported by the local server. Enter a model ID manually or load/pull a model first.';
      localModelStatus.classList.remove('hidden');
      return;
    }

    localModelStatus.textContent =
      models.length +
      ' local model' +
      (models.length === 1 ? '' : 's') +
      ' detected.';
    localModelStatus.classList.remove('hidden');

    if (models.length === 1 && !modelInput.value.trim()) {
      modelInput.value = models[0];
      vscode.postMessage({
        type: 'update-settings',
        payload: { model: models[0] }
      });
    }
  }

  function updateActionAvailability() {
    generateBtn.disabled = state.isGenerating;
    document.querySelectorAll('.scope-btn').forEach(function(btn) {
      btn.disabled = state.isGenerating;
    });
  }

  function updateGenerationModeVisibility() {
    var local = isLocalMode();
    var localProvider = !local && isLocalProvider();
    authSection.classList.toggle('hidden', local || localProvider);
    providerSection.classList.toggle('hidden', local);
    depthField.classList.toggle('hidden', local);
    localModeHelp.classList.toggle('hidden', !local);
    generateBtnText.textContent = local
      ? 'Generate Local Documentation'
      : 'Generate Documentation';
    if (local || localProvider) setApiKeyPanelVisible(false);
    updateCustomEndpointVisibility();
    updateModelPlaceholder();
    updateActionAvailability();
  }

  function setApiKeyStatus(configured, provider) {
    var selectedProvider = provider || providerSel.value;
    if (configured) {
      authStatus.className = 'auth-status ok';
      authText.textContent = 'API Key configured';
      authIcon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    } else if (selectedProvider === 'custom' || isLocalProvider(selectedProvider)) {
      authStatus.className = 'auth-status optional';
      authText.textContent = isLocalProvider(selectedProvider)
        ? 'No API key required'
        : 'API Key optional';
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

  function setReviewRating(rating) {
    reviewRating = Math.max(0, Math.min(5, Number(rating) || 0));

    if (reviewStars) {
      reviewStars.querySelectorAll('.review-star').forEach(function(star) {
        var value = Number(star.getAttribute('data-rating')) || 0;
        star.classList.toggle('selected', value <= reviewRating);
        star.textContent = value <= reviewRating ? '★' : '☆';
        star.setAttribute(
          'aria-checked',
          value === reviewRating ? 'true' : 'false'
        );
      });
    }

    var labels = {
      0: 'Choose 1–5 stars',
      1: '1 / 5 — Tell us what went wrong',
      2: '2 / 5 — We’d like to improve',
      3: '3 / 5 — Thanks for the feedback',
      4: '4 / 5 — Glad it’s helping',
      5: '5 / 5 — Thank you!'
    };
    if (reviewRatingLabel) {
      reviewRatingLabel.textContent = labels[reviewRating] || labels[0];
    }
    if (reviewMarketplaceBtn) {
      reviewMarketplaceBtn.disabled = reviewRating === 0;
    }
  }

  function updateReviewFeedbackState() {
    if (!reviewFeedback) return;
    var value = reviewFeedback.value || '';
    var length = value.length;
    if (reviewFeedbackCount) {
      reviewFeedbackCount.textContent = length + ' / 2000';
    }
    if (reviewFeedbackBtn) {
      reviewFeedbackBtn.disabled = !value.trim();
    }
    if (reviewFeedbackStatus && value.trim()) {
      reviewFeedbackStatus.textContent = '';
    }
  }

  function resetReviewCardInputs() {
    setReviewRating(0);
    if (reviewFeedback) reviewFeedback.value = '';
    if (reviewFeedbackStatus) reviewFeedbackStatus.textContent = '';
    updateReviewFeedbackState();
  }

  function setReviewPromptVisible(visible) {
    if (!reviewCard) return;

    reviewCard.classList.toggle('hidden', !visible);
    if (visible) {
      if (!reviewPromptPresentedSent) {
        reviewPromptPresentedSent = true;
        vscode.postMessage({ type: 'review-prompt-presented' });
      }
      window.setTimeout(function() {
        reviewCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    } else {
      reviewPromptPresentedSent = false;
      resetReviewCardInputs();
    }
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
    var previousProvider = providerSel.value;
    if (settings.generationMode) generationModeSel.value = settings.generationMode;
    if (settings.provider) providerSel.value = settings.provider;
    if (typeof settings.model === 'string') modelInput.value = settings.model;
    if (typeof settings.customApiEndpoint === 'string') customEndpointInput.value = settings.customApiEndpoint;
    if (settings.depth) $('depth').value = settings.depth;
    if (settings.outputFormat) $('outputFormat').value = settings.outputFormat;
    if (previousProvider !== providerSel.value) {
      lastLocalModelDiscoveryProvider = '';
    }
    updateGenerationModeVisibility();
    requestLocalProviderModels();
  }

  function validateLocalProviderModelForRun() {
    if (isLocalMode() || !isLocalProvider()) return true;

    var model = modelInput.value.trim();
    if (model) return true;

    var label = providerSel.value === 'ollama' ? 'Ollama' : 'LM Studio';
    addLog(
      'Enter a model name served by ' + label + ' before generating.',
      'error'
    );
    setStatus('error', 'Missing local model');
    modelInput.focus();
    return false;
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

  if (reviewStars) {
    reviewStars.querySelectorAll('.review-star').forEach(function(star) {
      star.addEventListener('click', function() {
        setReviewRating(Number(star.getAttribute('data-rating')) || 0);
      });
    });
  }

  if (reviewFeedback) {
    reviewFeedback.addEventListener('input', updateReviewFeedbackState);
  }

  if (reviewMarketplaceBtn) {
    reviewMarketplaceBtn.addEventListener('click', function() {
      if (!reviewRating) return;
      vscode.postMessage({
        type: 'review-marketplace',
        rating: reviewRating
      });
      setReviewPromptVisible(false);
    });
  }

  if (reviewFeedbackBtn) {
    reviewFeedbackBtn.addEventListener('click', function() {
      var feedback = reviewFeedback ? reviewFeedback.value.trim() : '';
      if (!feedback) {
        if (reviewFeedbackStatus) {
          reviewFeedbackStatus.textContent = 'Write a short note first.';
        }
        if (reviewFeedback) reviewFeedback.focus();
        return;
      }

      vscode.postMessage({
        type: 'review-feedback',
        rating: reviewRating || undefined,
        feedback: feedback
      });
      setReviewPromptVisible(false);
    });
  }

  function postponeReviewCard() {
    vscode.postMessage({ type: 'review-later' });
    setReviewPromptVisible(false);
  }

  if (reviewLaterBtn) reviewLaterBtn.addEventListener('click', postponeReviewCard);
  if (reviewCloseBtn) reviewCloseBtn.addEventListener('click', postponeReviewCard);

  if (reviewNeverBtn) {
    reviewNeverBtn.addEventListener('click', function() {
      vscode.postMessage({ type: 'review-never' });
      setReviewPromptVisible(false);
    });
  }

  generationModeSel.addEventListener('change', function() {
    updateGenerationModeVisibility();
    vscode.postMessage({
      type: 'update-settings',
      payload: { generationMode: generationModeSel.value }
    });
  });

  providerSel.addEventListener('change', function() {
    lastLocalModelDiscoveryProvider = '';
    updateGenerationModeVisibility();
    if (!isLocalProvider()) clearLocalModelDiscovery();
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
    if (!validateLocalProviderModelForRun()) return;
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
      if (!validateLocalProviderModelForRun()) return;
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
        setReviewPromptVisible(!!s.reviewPromptVisible);
        if (s.isGenerating) setGenerating(true);
        if (s.logs && s.logs.length) {
          s.logs.forEach(function(l) { addLog(l.message, l.type, l.timestamp); });
        }
        break;

      case 'review-prompt-visibility':
        setReviewPromptVisible(!!msg.visible);
        break;

      case 'settings-normalized':
        applyNormalizedSettings(msg.settings);
        break;

      case 'local-models':
        applyLocalProviderModels(msg);
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

  resetReviewCardInputs();
  vscode.postMessage({ type: 'ready' });

})();
`;
