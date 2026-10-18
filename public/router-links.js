(() => {
  const isPlainPrimaryClick = (event, anchor) => (
    event.button === 0
    && !event.defaultPrevented
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
    && (!anchor.target || anchor.target === '_self')
  );

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[data-app-route]');
    if (!anchor || !isPlainPrimaryClick(event, anchor)) return;

    const appRoute = anchor.dataset.appRoute;
    if (!appRoute || !appRoute.startsWith('#/')) return;

    event.preventDefault();

    if (window.location.pathname !== '/' || window.location.search) {
      window.location.assign('/' + appRoute);
      return;
    }

    if (window.location.hash === appRoute) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    window.location.hash = appRoute;
  });
})();
