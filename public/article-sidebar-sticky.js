(function () {
	if (window.__articleSidebarStickyBooted) {
		return;
	}
	window.__articleSidebarStickyBooted = true;

	const SIDEBAR_SELECTOR = ".article-sidebar-with-toc";
	const PROFILE_SELECTOR = ".article-profile";
	let disposeCurrent = null;

	const cleanup = () => {
		if (typeof disposeCurrent === "function") {
			disposeCurrent();
			disposeCurrent = null;
		}
	};

	const init = () => {
		cleanup();

		const sidebar = document.querySelector(SIDEBAR_SELECTOR);
		if (!(sidebar instanceof HTMLElement)) {
			return;
		}

		const profile = sidebar.querySelector(PROFILE_SELECTOR);
		if (!(profile instanceof HTMLElement)) {
			return;
		}

		let frameId = 0;
		const syncProfileHeight = () => {
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			frameId = window.requestAnimationFrame(() => {
				const height = Math.ceil(profile.getBoundingClientRect().height);
				sidebar.style.setProperty("--article-profile-height", `${height}px`);
			});
		};

		syncProfileHeight();
		window.addEventListener("resize", syncProfileHeight, { passive: true });

		let resizeObserver = null;
		if ("ResizeObserver" in window) {
			resizeObserver = new ResizeObserver(() => {
				syncProfileHeight();
			});
			resizeObserver.observe(profile);
		}

		disposeCurrent = () => {
			window.removeEventListener("resize", syncProfileHeight);
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			resizeObserver?.disconnect();
			sidebar.style.removeProperty("--article-profile-height");
		};
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init, { once: true });
	} else {
		init();
	}

	document.addEventListener("astro:before-swap", cleanup);
	document.addEventListener("astro:page-load", init);
})();
