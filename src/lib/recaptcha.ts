export async function loadRecaptchaEnterprise(siteKey: string, timeout = 10000): Promise<void> {
  if (!siteKey) {
    throw new Error('No reCAPTCHA site key provided');
  }

  // If grecaptcha.enterprise already exists, assume it's usable
  if ((window as any).grecaptcha && ((window as any).grecaptcha.enterprise || (window as any).grecaptcha.render)) {
    return;
  }

  // Remove any existing recaptcha script tags that specify a different render key
  const scripts = Array.from(document.querySelectorAll('script[src*="recaptcha"]')) as HTMLScriptElement[];
  for (const s of scripts) {
    try {
      const url = new URL(s.src, window.location.href);
      const render = url.searchParams.get('render');
      if (render && render !== siteKey) {
        s.remove();
      }
    } catch {
      // ignore
    }
  }

  // If a matching script already exists on the page, wait for it to load
  const existing = Array.from(document.querySelectorAll(`script[src*="render=${siteKey}"]`)) as HTMLScriptElement[];
  if (existing.length > 0) {
    const el = existing[0];
    if ((window as any).grecaptcha) return;
    await new Promise<void>((resolve, reject) => {
      const done = () => resolve();
      el.addEventListener('load', done);
      el.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA script')));
      setTimeout(() => reject(new Error('reCAPTCHA load timeout')), timeout);
    });
    return;
  }

  // Otherwise create a new script tag with the correct site key
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(() => {
      script.onerror = null;
      script.onload = null;
      reject(new Error('reCAPTCHA load timeout'));
    }, timeout);

    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });
}
