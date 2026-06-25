# js-common

A lightweight, zero-dependency JavaScript utility library for building modern web applications. It provides a cohesive set of modules covering DOM manipulation, declarative data binding, a plugin system, caching, and general-purpose helpers — all written in vanilla ES modules.

## Features

- **Declarative DOM Data Binding** — Populate DOM elements from data objects using `data-*` attributes. Handles single values, arrays, templates, conditional display, filters, and value formatting.
- **Plugin System** — Dynamic component lifecycle management via custom events (`PluginHost` / `Plugin`), with automatic registration, timeout handling, and message queuing.
- **DSL Factories** — Parse string-based mini-DSL expressions into functional objects for property definitions, template selectors, and data filters.
- **DOM Utilities** — Safely query, show/hide, enable/disable, and observe elements. Includes `MutationObserver` registration, custom event dispatching, and target resolution (`self`, `parent`, `children`, `closest`).
- **General Utilities** — Type checking, assertions, string/number/date formatting, debounce/throttle, abortable promises, URL handling, JSON↔query string conversion.
- **Caching** — Generic `Map`-based cache with lazy initialization and an `InstanceMap` for associating DOM elements with object instances.
- **Config Lookup** — Multi-source configuration resolver that searches fallback sources in priority order.
- **Tree-shakable** — Each module is a separate entry point; import only what you need.

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

Each source file in `src/` is bundled and minified into `dist/` using [esbuild](https://esbuild.github.io/). Source maps are generated alongside each output file:

```
dist/js-constant.min.js
dist/js-utils.min.js
dist/js-dom-utils.min.js
dist/js-dom-helper.min.js
dist/js-dataset-helper.min.js
dist/js-dsl-factory.min.js
dist/js-cache.min.js
dist/js-config.min.js
dist/js-plugin.min.js
```

## Module Overview

### `js-constant`

String constants for type assertions used across all modules. Defines type labels (`Object`, `Function`, `Array`, etc.), HTML element tag names, and error categories.

### `js-utils`

Core utility belt. Provides:

| Category | Highlights |
|---|---|
| Type Checking | `isArray`, `isObject`, `isString`, `isElement`, `isPromise`, `isURL`, `isTrue`, `isNotBlank` |
| Assertions | `assert(condition, message, type)` for runtime checks |
| Array / Object | `toArray`, `split`, `objectKeys`, `objectValues`, `objectEntries`, `findObjectValue` |
| String | `startsWith`, `endsWith`, `toCamelCase`, `toKebabCase`, `valueToString`, `stringToValue` |
| Formatting | `formatNumber`, `formatString`, `formatDate` |
| Async | `delay`, `debounce`, `throttle`, `abortable` |
| URL | `addBasePath`, `jsonToQueryString` |

### `js-dom-utils`

Safe DOM helpers. All functions handle edge cases (null elements, empty selectors, etc.) gracefully.

- `elementIs(el, type)` — Check tag name or input type
- `hasClass` / `addClass` / `removeClass`
- `querySelector(selectors, root, includeSelf)` — Returns a deduplicated array of elements
- `getTargets(targets, el)` — Resolves declarative target strings (`self`, `parent`, `children`, `closest`, CSS selectors)
- `showElements` / `hideElements` / `enableElements` / `disableElements`
- `registerMutationObserver` / `registerAttributeChange` — Wraps `MutationObserver`
- `registerEvent` / `triggerEvent` / `stopDefaultEvent` — Custom event helpers

### `js-cache`

- `createCache()` — Generic `Map`-based cache with lazy initialization: `cache.get(key, () => computeExpensiveValue(key))`
- `createInstanceMap(conditionCallback, createCallback)` — Associates DOM elements with object instances, calling `createCallback` once per element.

### `js-dataset-helper`

Manipulates `data-*` attributes on HTML elements with an optional prefix. Provides:

- `keyToAttrName` / `keyToDatasetName` — Convert logical keys to/from `data-*` attribute names
- `getValue` / `setValue` — Read/write dataset values
- `getKeys` — List all dataset keys under a given prefix
- `resolveValues` — Collect a group of dataset properties into a single object

### `js-dsl-factory`

Parses string-based mini-DSL expressions:

- **`createProperty(prop)`** — Parses pipe-delimited tokens like `"class1,class2|hidden:role=admin"` into structured objects with typed keys and values.
- **`createTemplateHandler(prop)`** — Builds template resolvers that select and clone `<template>` fragments or `<style>` elements, supporting conditional selection based on data properties.
- **`createFilter(prop)`** — Parses filter expressions with comparison operators (`==`, `!=`, `>=`, `<=`, `>`, `<`, `=~` regex) and negation (`!`).
- **`Comparable`** — Internal class that evaluates filter expressions against values.

### `js-config`

Multi-source configuration lookup:

```js
const config = createConfig(envDefaults, userOverrides, runtimeConfig)
config.get(['apiUrl', 'timeout'])  // → { apiUrl: '...', timeout: 3000 }
```

Searches sources in order and returns the first match for each key.

### `js-plugin`

A lightweight plugin system using custom DOM events for communication:

- **`PluginHost(root)`** — Host that manages plugins within a root element. Calls `addPlugin(pluginRoot)` to start polling; `ready()` returns a promise that resolves when all plugins have registered; `broadcast()` sends messages to all plugins.
- **`Plugin(name, root, initialize)`** — Plugin that registers with host(s) when it receives a check event. Supports async initialization. Messages sent before registration are queued and delivered automatically.

### `js-dom-helper`

High-level declarative DOM data binding. The centerpiece module that ties everything together. Given a data object, it traverses a DOM subtree and fills elements based on `data-*` attributes:

- `setValueToElement(el, data)` — Binds data to an element and its descendants. Handles arrays (cloning templates), conditional display (`hidden`, `filter`), class toggling, attribute setting, and value injection.
- `clearElement(el)` — Reverses the binding, removing created elements and resetting filled values.
- Supports value types: `string`, `number`, `percentage`, `date` with formatting options.
- Supports enum lookups from `window` globals, `<select>` options, or inline DSL definitions.
- Array iteration with `seq` tracking, index-based value resolution, and last-element anchoring.

## License

ISC
