const defaultOpts = {
	applicationInstance: null,
	appEnvConfig: {}
};

export default function singleSpaEmber(userOpts) {
	if (typeof appEnvConfig !== 'object') {
		throw new Error(`single-spa-ember requires a configuration object`);
	}

	const opts = {
		...defaultOpts,
		...userOpts,
	};
	
	if (opts.appEnvConfig && typeof opts.appEnvConfig !== 'object') {
		throw new Error(`single-spa-ember: appEnvConfig must be an object to be passed to App.create()`);
	}

	return {
		bootstrap: bootstrap.bind(null, opts),
		mount: mount.bind(null, opts),
		unmount: unmount.bind(null, opts),
	};
}

function bootstrap(opts) {
	return Promise.resolve();
}

function mount(opts) {
	return Promise
		.resolve()
		.then(() => {
			let appEnvConfig = opts.appEnvConfig
			let appName = appEnvConfig.modulePrefix;
			opts.applicationInstance = require(appName+"/app")["default"].create(appEnvConfig.APP);
		});
}

function unmount(opts) {
	return Promise
		.resolve()
		.then(() => {
			opts.applicationInstance.destroy();
			opts.applicationInstance = null;
		});
}

/* This is a helper function that will load an ember app via script tags and then
 * hook into Ember's built-in module registry (window.define/window.require) in order
 * to pass the app module and it's lifecycle functions to single-spa.
 *
 * appName: the name of the ember application. This will be used to window.require(appName + '/app');
 * appUrl: the url to script tag for the ember application.
 * vendorUrl (optional): if provided, the vendor bundle will be loaded first before the application bundle.
 *   This is optional since you could have more than one single-spa applications written in Ember, but only
 *   one vendor bundle.
 */
export function loadEmberApp(appName, appUrl, vendorUrl = null) {
	return new Promise((resolve, reject) => {
		if (typeof appName !== 'string') {
			reject(new Error(`single-spa-ember requires an appName string as the first argument`));
			return;
		}

		if (typeof appUrl !== 'string') {
			reject(new Error(`single-spa-ember requires an appUrl string as the second argument`));
			return;
		}

		if (vendorUrl && typeof vendorUrl !== 'string') {
			reject(new Error(`single-spa-ember vendorUrl (the third argument) is optional, but must be a string if present`));
			return;
		}

		if (vendorUrl) {
			const scriptVendor = document.createElement('script');
			scriptVendor.src = '/build/'+appName+'/assets/vendor.js';
			scriptVendor.async = true;
			scriptVendor.onload = loadEmberApp;
			scriptVendor.onerror = reject;
			document.head.appendChild(scriptVendor);
		} else {
			loadEmberApp();
		}

		function loadEmberApp() {
			const scriptEl = document.createElement('script');
			scriptEl.src = '/build/'+appName+'/assets/ember-app.js';
			scriptEl.async = true;
			scriptEl.onload = () => {
				resolve(window.require(appName+'/app'));
			}
			scriptEl.onerror = reject;
			document.head.appendChild(scriptEl);
		}
	});
}
