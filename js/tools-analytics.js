(function (window) {
    'use strict';

    var DEFAULT_MEASUREMENT_ID = 'G-JDKGJ1E005';
    var DEFAULT_UI_VERSION = 'v1';
    var initialized = false;
    var engagementMs = 0;
    var visibleSinceMs = 0;
    var hasSentEngagement = false;

    function ensureGtag() {
        window.dataLayer = window.dataLayer || [];
        if (typeof window.gtag !== 'function') {
            window.gtag = function () {
                window.dataLayer.push(arguments);
            };
        }
    }

    function getMeasurementId() {
        return window.XU_GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID;
    }

    function getUiVersion() {
        if (window.XU_UI_VERSION) {
            return toSafeString(window.XU_UI_VERSION, 40);
        }

        var htmlVersion = window.document && window.document.documentElement
            ? window.document.documentElement.getAttribute('data-ui-version')
            : '';
        if (htmlVersion) {
            return toSafeString(htmlVersion, 40);
        }

        var versionMeta = window.document
            ? window.document.querySelector('meta[name="xullua-ui-version"]')
            : null;
        if (versionMeta && versionMeta.content) {
            return toSafeString(versionMeta.content, 40);
        }

        return DEFAULT_UI_VERSION;
    }

    function parseUiVersion(versionText) {
        var text = toSafeString(versionText, 40).toLowerCase();
        var match = text.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);

        if (!match) {
            return {
                major: 0,
                minor: 0,
                patch: 0,
                code: 0
            };
        }

        var major = Number(match[1] || 0);
        var minor = Number(match[2] || 0);
        var patch = Number(match[3] || 0);

        return {
            major: major,
            minor: minor,
            patch: patch,
            code: major * 10000 + minor * 100 + patch
        };
    }

    function initAnalytics() {
        if (initialized) {
            return;
        }

        ensureGtag();
        window.gtag('js', new Date());
        window.gtag('config', getMeasurementId());
        initialized = true;
    }

    function toSafeString(value, maxLength) {
        var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
        if (!maxLength || text.length <= maxLength) {
            return text;
        }
        return text.slice(0, maxLength);
    }

    function toToolIdFromPath() {
        var match = window.location.pathname.match(/\/tools\/([^\/]+)/);
        if (!match) {
            return 'unknown_tool';
        }

        var raw = match[1];
        if (raw.indexOf('.html') > -1) {
            return raw.replace('.html', '').replace(/-/g, '_');
        }
        return raw.replace(/-/g, '_');
    }

    function compactParams(params) {
        var output = {};
        Object.keys(params || {}).forEach(function (key) {
            var value = params[key];
            if (value === undefined || value === null || value === '') {
                return;
            }
            output[key] = value;
        });
        return output;
    }

    function trackEvent(eventName, params) {
        if (!eventName) {
            return;
        }
        initAnalytics();
        window.gtag('event', eventName, compactParams(params));
    }

    function nowMs() {
        if (window.performance && typeof window.performance.now === 'function') {
            return window.performance.now();
        }
        return Date.now();
    }

    function startVisibleTimer() {
        if (visibleSinceMs > 0) {
            return;
        }
        visibleSinceMs = nowMs();
    }

    function stopVisibleTimer() {
        if (visibleSinceMs <= 0) {
            return;
        }
        engagementMs += Math.max(0, nowMs() - visibleSinceMs);
        visibleSinceMs = 0;
    }

    function trackToolEvent(options) {
        var opts = options || {};
        var actionName = toSafeString(opts.actionName || 'custom_action', 60);
        var toolId = toSafeString(opts.toolId || toToolIdFromPath(), 40);
        var uiVersion = getUiVersion();
        var uiVersionParts = parseUiVersion(uiVersion);

        var payload = {
            tool_id: toolId,
            ui_version: uiVersion,
            ui_version_major: uiVersionParts.major,
            ui_version_minor: uiVersionParts.minor,
            ui_version_patch: uiVersionParts.patch,
            ui_version_code: uiVersionParts.code,
            action_name: actionName,
            action_group: toSafeString(opts.actionGroup || 'lifecycle', 30),
            trigger: toSafeString(opts.trigger || 'system', 30),
            mode: toSafeString(opts.mode || '', 40),
            result_status: toSafeString(opts.resultStatus || 'success', 20),
            error_code: toSafeString(opts.errorCode || '', 60),
            duration_sec: typeof opts.durationSec === 'number' ? Number(opts.durationSec.toFixed(3)) : undefined,
            value_num: typeof opts.valueNum === 'number' ? opts.valueNum : undefined
        };

        var eventName = toSafeString(opts.eventName || ('tool_' + actionName), 80);
        var extraParams = opts.extraParams || {};

        trackEvent(eventName, Object.assign(payload, extraParams));
    }

    function sendEngagementIfNeeded(trigger) {
        if (hasSentEngagement) {
            return;
        }

        stopVisibleTimer();
        hasSentEngagement = true;

        trackToolEvent({
            eventName: 'tool_page_engagement',
            actionName: 'page_engagement',
            actionGroup: 'lifecycle',
            trigger: trigger || 'pagehide',
            durationSec: Number((engagementMs / 1000).toFixed(3)),
            extraParams: {
                page_path: window.location.pathname,
                page_title: toSafeString(window.document.title, 120)
            }
        });
    }

    function setupEngagementTracking() {
        if (window.document.hidden) {
            visibleSinceMs = 0;
        } else {
            startVisibleTimer();
        }

        window.document.addEventListener('visibilitychange', function () {
            if (window.document.hidden) {
                stopVisibleTimer();
                return;
            }
            startVisibleTimer();
        });

        window.addEventListener('pagehide', function () {
            sendEngagementIfNeeded('pagehide');
        });

        window.addEventListener('beforeunload', function () {
            sendEngagementIfNeeded('beforeunload');
        });
    }

    function setUiVersion(version) {
        window.XU_UI_VERSION = toSafeString(version, 40);
    }

    window.XuAnalytics = {
        initAnalytics: initAnalytics,
        trackEvent: trackEvent,
        trackToolEvent: trackToolEvent,
        toToolIdFromPath: toToolIdFromPath,
        setUiVersion: setUiVersion,
        getUiVersion: getUiVersion
    };

    initAnalytics();
    setupEngagementTracking();
})(window);
