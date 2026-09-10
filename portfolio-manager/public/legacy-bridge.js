// Keep the existing specialist tools behind the same localhost session guard.
const cmsNativeFetch = window.fetch.bind(window);
const cmsSession = cmsNativeFetch('/api/studio/session').then(r => r.json());
window.fetch = async function(input, options = {}) {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, location.href);
    const method = options.method || input.method || 'GET';
    if (requestUrl.origin === location.origin && requestUrl.pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(method.toUpperCase())) {
        const headers = new Headers(options.headers || input.headers);
        headers.set('X-CMS-Token', (await cmsSession).token);
        options = { ...options, headers };
    }
    return cmsNativeFetch(input, options);
};
window.addEventListener('DOMContentLoaded', () => {
    window.publishRepo = () => { location.href = '/?publish'; };
    const link = document.createElement('a');
    link.href = '/'; link.textContent = '← Zur neuen Redaktion';
    link.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:99999;background:#c7f36d;color:#192228;padding:12px 16px;border-radius:8px;font:14px Arial;text-decoration:none';
    document.body.append(link);
});
