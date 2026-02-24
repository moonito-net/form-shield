/**
 * Form Shield by Moonito
 * https://moonito.net
 *
 * Intercepts form submissions on your website and validates email/phone
 * fields against the Moonito Form Shield API before allowing the form
 * to submit. Blocks spam, fake leads, and invalid contacts in real time.
 *
 * Usage:
 *   <script
 *     src="https://cdn.jsdelivr.net/gh/moonito-net/form-shield/form-shield.min.js"
 *     data-key="YOUR_PUBLIC_KEY">
 *   </script>
 *
 * Optional attributes:
 *   data-form-selector   — CSS selector(s) to target specific forms (comma-separated)
 *   data-email-field     — Email field name(s) (default: "email", comma-separated)
 *   data-phone-field     — Phone field name(s) (default: "phone", comma-separated)
 */
(function() {
  'use strict';

  // Find the current script tag and read configuration
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var publicKey = currentScript.getAttribute('data-key');
  var formSelector = currentScript.getAttribute('data-form-selector') || '';

  // Parse comma-separated field names into arrays (supports multiple field names per type)
  var emailFields = (currentScript.getAttribute('data-email-field') || 'email')
    .split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  var phoneFields = (currentScript.getAttribute('data-phone-field') || 'phone')
    .split(',').map(function(s) { return s.trim(); }).filter(Boolean);

  // API endpoint — hardcoded to Moonito (this file is served from jsDelivr CDN)
  var apiUrl = 'https://moonito.net/api/v1/form-shield/validate';

  // Flag to prevent infinite submit loop
  var isResubmitting = false;

  // -- Namespacing ---------------------------------------------------------
  // All identifiers are prefixed with _fshield_ to avoid colliding with
  // anything already present on the user's website or app.

  var NS        = '_fshield_';          // data attribute prefix
  var ERROR_CLS = '_fshield_err';       // marker class on error divs (no styles — purely for selection)
  var STYLE_ID  = '_fshield_styles';    // <style> element id
  var KF_NAME   = '_fshield_spin';      // @keyframes name

  // Inject the spinner keyframe exactly once, regardless of how many times
  // this script runs (e.g. multiple public keys on the same page).
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '@keyframes ' + KF_NAME + '{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  // -- Button lock helpers -------------------------------------------------

  /**
   * Returns all submit buttons inside a form, including <button> elements
   * that have no type attribute (which browsers treat as type="submit").
   */
  function getSubmitButtons(form) {
    return form.querySelectorAll(
      'button:not([type="button"]):not([type="reset"]), input[type="submit"]'
    );
  }

  /**
   * Disable all submit buttons in a form and show a spinner.
   */
  function lockSubmit(form) {
    var buttons = getSubmitButtons(form);
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.dataset[NS + 'locked']) continue;
      btn.dataset[NS + 'locked'] = '1';
      btn.disabled = true;
      if (btn.tagName === 'BUTTON') {
        btn.dataset[NS + 'orig'] = btn.innerHTML;
        btn.innerHTML =
          '<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;' +
          'border-top-color:transparent;border-radius:50%;animation:' + KF_NAME + ' 0.6s linear infinite;' +
          'vertical-align:middle;margin-right:6px;"></span>Validating\u2026';
      } else {
        btn.dataset[NS + 'orig'] = btn.value;
        btn.value = 'Validating\u2026';
      }
    }
  }

  /**
   * Re-enable all submit buttons and restore their original content.
   */
  function unlockSubmit(form) {
    var buttons = getSubmitButtons(form);
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (!btn.dataset[NS + 'locked']) continue;
      btn.disabled = false;
      if (btn.tagName === 'BUTTON') {
        btn.innerHTML = btn.dataset[NS + 'orig'] || '';
      } else {
        btn.value = btn.dataset[NS + 'orig'] || 'Submit';
      }
      delete btn.dataset[NS + 'locked'];
      delete btn.dataset[NS + 'orig'];
    }
  }

  // -- Resubmit ------------------------------------------------------------

  /**
   * Re-submit the form after validation passes.
   *
   * Instead of calling form.submit() directly (which bypasses all event
   * listeners and breaks jQuery AJAX / React / Vue handlers), we re-dispatch
   * a new native submit event. This lets framework handlers run normally.
   * Only if nothing else handles the submission do we fall back to the native
   * form.submit().
   *
   * Important: if a framework handler calls preventDefault() (meaning it will
   * handle the request itself via AJAX), the page will NOT navigate, so we
   * must unlock the buttons — otherwise they stay disabled forever.
   */
  function resubmit(form) {
    isResubmitting = true;
    var evt = new Event('submit', { bubbles: true, cancelable: true });
    var notCancelled = form.dispatchEvent(evt);
    if (notCancelled) {
      // Plain HTML form — native submit, page will navigate away
      form.submit();
    } else {
      // Framework (jQuery/React/Vue) handles it via its own AJAX.
      // Page is NOT navigating, so restore the button for potential re-use.
      unlockSubmit(form);
    }
  }

  // -- Error helpers -------------------------------------------------------

  // Inline styles only — we do NOT rely on any class-based CSS so there is
  // no chance the user's stylesheet overrides how errors look.
  var ERROR_STYLE = 'color:#dc3545;font-size:0.85em;margin-top:4px;display:block;';

  function clearErrors(form) {
    var errors = form.querySelectorAll('.' + ERROR_CLS);
    for (var i = 0; i < errors.length; i++) {
      errors[i].parentNode.removeChild(errors[i]);
    }
  }

  function showError(field, message) {
    if (!field) return;
    var div = document.createElement('div');
    div.className = ERROR_CLS;
    div.setAttribute('style', ERROR_STYLE);
    div.textContent = message;
    if (field.nextSibling) {
      field.parentNode.insertBefore(div, field.nextSibling);
    } else {
      field.parentNode.appendChild(div);
    }
  }

  // -- Field finder --------------------------------------------------------

  function findField(form, names, isEmail) {
    if (!Array.isArray(names)) names = [names];
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var field = form.querySelector('[name="' + name + '"]');
      if (field) return field;
      field = form.querySelector('[name="' + name + '[]"]');
      if (field) return field;
    }
    // Fallback by input type
    if (isEmail) {
      return form.querySelector('input[type="email"]') || null;
    }
    return form.querySelector('input[type="tel"]') || null;
  }

  // -- Form targeting ------------------------------------------------------

  function isTargetForm(form) {
    if (!formSelector) return true;
    var selectors = formSelector.split(',');
    for (var i = 0; i < selectors.length; i++) {
      var sel = selectors[i].trim();
      if (sel && form.matches(sel)) return true;
    }
    return false;
  }

  // -- Data extraction -----------------------------------------------------

  function extractData(form) {
    var data = {};
    var emailInput = findField(form, emailFields, true);
    if (emailInput && emailInput.value) data.email = emailInput.value.trim();
    var phoneInput = findField(form, phoneFields, false);
    if (phoneInput && phoneInput.value) data.phone = phoneInput.value.trim();
    data.form_action = form.action || window.location.href;
    return data;
  }

  // -- Submit handler ------------------------------------------------------

  function handleSubmit(event) {
    if (isResubmitting) {
      isResubmitting = false;
      return;
    }

    var form = event.target;
    if (form.tagName !== 'FORM') return;
    if (!isTargetForm(form)) return;

    var data = extractData(form);
    if (!data.email && !data.phone) return;

    event.preventDefault();
    event.stopPropagation();

    clearErrors(form);
    lockSubmit(form);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Form-Shield-Key', publicKey);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = function() {
      try {
        var response = JSON.parse(xhr.responseText);

        if (response.data && response.data.status === 'pass') {
          resubmit(form); // unlocks if framework handles it
          return;
        }

        if (response.data && response.data.status === 'fail' && response.data.errors) {
          var errors = response.data.errors;
          for (var fieldName in errors) {
            if (!errors.hasOwnProperty(fieldName)) continue;
            var targetField = null;
            if (fieldName === 'email') {
              targetField = findField(form, emailFields, true);
            } else if (fieldName === 'phone') {
              targetField = findField(form, phoneFields, false);
            } else if (fieldName === '_rate_limit') {
              targetField = findField(form, emailFields, true) || findField(form, phoneFields, false);
            }
            showError(targetField, errors[fieldName]);
          }
          unlockSubmit(form);
          return;
        }

        // Unexpected response — fail open
        unlockSubmit(form);
        resubmit(form);
      } catch (e) {
        // JSON parse error — fail open
        unlockSubmit(form);
        resubmit(form);
      }
    };

    xhr.onerror = function() {
      unlockSubmit(form);
      resubmit(form);
    };

    xhr.ontimeout = function() {
      unlockSubmit(form);
      resubmit(form);
    };

    xhr.timeout = 15000; // 15s covers slow SMTP checks

    xhr.send(JSON.stringify(data));
  }

  // -- Init ----------------------------------------------------------------

  function init() {
    if (!publicKey) {
      console.warn('Form Shield: No data-key attribute found on script tag.');
      return;
    }
    document.addEventListener('submit', handleSubmit, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
