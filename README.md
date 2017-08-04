# single-spa-ember
Helper functions for using [single-spa](https://github.com/CanopyTax/single-spa) and [ember](https://www.emberjs.com/) together.

It is available on npm as `single-spa-ember`, and also available on bower as `single-spa-ember` in case you want to use it with ember cli and need to use bower.

## Overview
When you are building a an ember application that you want to work as a [single-spa child application](https://github.com/CanopyTax/single-spa/blob/master/docs/child-applications.md), there are five things you need to implement:
- A [loading function](https://github.com/CanopyTax/single-spa/blob/master/docs/root-application.md#loading-function)
- An [activity function](https://github.com/CanopyTax/single-spa/blob/master/docs/root-application.md#activity-function)
- A [bootstrap function](https://github.com/CanopyTax/single-spa/blob/master/docs/child-applications.md#bootstrap)
- A [mount function](https://github.com/CanopyTax/single-spa/blob/master/docs/child-applications.md#mount)
- An [unmount function](https://github.com/CanopyTax/single-spa/blob/master/docs/child-applications.md#unmount)

Single-spa-ember will help you implement all of those except for the activity function.

Note that the loading and activity functions are part of the [single-spa root application](https://github.com/CanopyTax/single-spa/blob/master/docs/root-application.md), whereas the bootstrap, mount, and unmount functions are part of a [single-spa child application](https://github.com/CanopyTax/single-spa/blob/master/docs/child-applications.md)

## API
#### loadEmberApp
`loadEmberApp(appName, appUrl, vendorUrl)` is a function that helps you implement the [loading function](https://github.com/CanopyTax/single-spa/blob/master/docs/root-application.md#loading-function) for your ember child application.
`appName` and `appUrl` are both strings and both required, whereas `vendorUrl` is an optional string.

```js
// In the single-spa root application

import {declareChildApplication} from 'single-spa';
import {loadEmberApp} from 'single-spa-ember';

const appName = 'ember-app';
const loadingFunction = () => loadEmberApp(appName, '/dist/ember-app/assets/ember-app.js', '/dist/ember-app/assets/vendor.js');
const activityFunction = location => location.hash.startsWith('ember');

declareChildApplication(appName, loadingFunction, activityFunction);
```

#### singleSpaEmber
Single-spa-ember will implement the [single-spa lifecyle functions](https://github.com/CanopyTax/single-spa/blob/master/docs/child-applications.md#child-application-lifecycle) for you. To use it, you call the default export as a function with a configuration object, which returns an object that has `bootstrap`, `mount`, and `unmount` lifecycle functions on it. The provided configuration object has the following options:
  - `App` (required): The [ember Application](https://www.emberjs.com/api/ember/2.14.1/classes/Ember.Application).
  - `createOpts` (optional): The options to provide when calling [App.create(options)](https://www.emberjs.com/api/ember/2.14.1/classes/Ember.Application). See the [ember docs](https://www.emberjs.com/api/ember/2.14.1/classes/Ember.Application) for more details.

```js
// In the ember child application
import singleSpaEmber from 'single-spa-ember';

const emberLifecycles = singleSpaEmber({
  appName: 'ember-app', // required
  createOpts: { // See https://www.emberjs.com/api/ember/2.14.1/classes/Ember.Application
    rootElement: '#ember-app',
  },
});
```

## Usage with ember cli
For the most part, you can get applications that use [ember cli](https://ember-cli.com/) to work pretty seamlessly with single-spa. Maybe the biggest thing you'll have to worry about is that ember-cli assumes that it controls the entire html page, whereas a single-spa child application does not. However, usually we can achieve equivalent behavior by just loading the vendor and app bundles into the html page dynamically, instead of baking them right into the html page. Below is a description of the known things you should do when setting up an ember-cli application with single-spa:

First, since the ember cli only supports dependencies from bower, you'll need to do:
- `bower init`
- `bower install single-spa-examples --save`

Add the following options to your ember-cli-build.js file:
```js
/* eslint-env node */
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    autoRun: false, // Set autoRun to false, because we only want the ember app to render to the DOM when single-spa tells it to.
    storeConfigInMeta: false, // We're making a single-spa child application, which doesn't exclusively own the html file. So we don't want to have to have a `<meta>` tag for the ember environment to be initialized.
		fingerprint: {
			customHash: null, // This is optional, just will make it easier for you to have the same url every time you do an ember build.
		},
    // Add options here
  });
  
  // Tell ember how to use the single-spa-ember library
  app.import('bower_components/single-spa-ember/amd/single-spa-ember.js', {
		using: [
			{transformation: 'amd', as: 'single-spa-ember'},
		],
	});

  return app.toTree();
};
```

In your single-spa root application (which is separate from anything generated by ember cli):

```js
// root-application.js
import * as singleSpa from 'single-spa';
import {loadEmberApp} from 'single-spa-ember';

singleSpa.declareChildApplication('ember-app', activityFunction, loadingFunction);

function activityFunction(location) {
  // Only render the ember app when the url hash starts with ember
  return location.hash.startsWith('ember');
}

// single-spa-ember helps us load the script tags and give the ember app module to single-spa.
function loadingFunction() {
  const appName = 'ember-app';
  const appUrl = '/dist/ember-app/assets/ember-app.js';
  const vendorUrl = '/dist/ember-app/assets/vendor.js'; // Optional if you have one vendor bundle used for many different ember apps
  return loadEmberApp(appName, appUrl, vendorUrl);
}
```

In your app.js file (that is generated by ember cli)

```js
// app.js (the ember child application)
import Ember from 'ember';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';
import singleSpaEmber from 'single-spa-ember';

// This part is generated by the ember cli
const App = Ember.Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver
});

loadInitializers(App, config.modulePrefix);

export default App;

// This is the single-spa part
const emberLifecycles = singleSpaEmber({
	App, // required
	appName: 'ember-app', // required
	createOpts: { // optional
		rootElement: '#ember-app',
	},
})

// Single-spa lifecycles.
export function bootstrap() {
	return emberLifecycles.bootstrap();
}

export function mount() {
	return emberLifecycles.mount();
}

export function unmount() {
	return emberLifecycles.unmount();
}
```
