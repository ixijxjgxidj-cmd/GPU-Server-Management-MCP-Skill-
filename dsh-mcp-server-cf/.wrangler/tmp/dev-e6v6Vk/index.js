var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-EAA0u5/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = /* @__PURE__ */ __name(class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
}, "HonoRequest");

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = /* @__PURE__ */ __name(class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
}, "Context");

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = /* @__PURE__ */ __name(class extends Error {
}, "UnsupportedPathError");

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = /* @__PURE__ */ __name(class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app7) {
    const subApp = this.basePath(path);
    app7.routes.map((r) => {
      let handler;
      if (app7.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app7.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
}, "_Hono");

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = /* @__PURE__ */ __name(class _Node {
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
}, "_Node");

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = /* @__PURE__ */ __name(class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = /* @__PURE__ */ Object.create(null);
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
}, "Trie");

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = /* @__PURE__ */ __name(class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      Object.keys(middleware).forEach((m) => {
        if ((method === METHOD_NAME_ALL || method === m) && !middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      });
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          if (!routes[m][path2]) {
            this.#insertPath(m, path2);
            routes[m][path2] = [
              ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
            ];
          }
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = this.#tries = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = /* @__PURE__ */ Object.create(null);
    const handlerData = [];
    [middleware, routes].forEach((r) => {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
          continue;
        }
        const paramAssoc = pathData[1];
        handlerData[pathData[0]] = handlers.map(([h, paramCount]) => {
          const paramIndexMap = /* @__PURE__ */ Object.create(null);
          paramCount -= 1;
          for (; paramCount >= 0; paramCount--) {
            const [key, value] = paramAssoc[paramCount];
            paramIndexMap[key] = value;
          }
          return [h, paramIndexMap];
        });
      }
    });
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (let i = 0, len = handlerData.length; i < len; i++) {
      for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
        const map = handlerData[i][j]?.[1];
        if (!map) {
          continue;
        }
        const keys = Object.keys(map);
        for (let k = 0, len3 = keys.length; k < len3; k++) {
          map[keys[k]] = paramReplacementMap[map[keys[k]]];
        }
      }
    }
    const handlerMap = [];
    for (const i in indexReplacementMap) {
      handlerMap[i] = handlerData[indexReplacementMap[i]];
    }
    return [regexp, handlerMap, staticMap];
  }
}, "RegExpRouter");

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = /* @__PURE__ */ __name(class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
}, "SmartRouter");

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = /* @__PURE__ */ __name(class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
}, "_Node");

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = /* @__PURE__ */ __name(class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
}, "TrieRouter");

// node_modules/hono/dist/hono.js
var Hono2 = /* @__PURE__ */ __name(class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, "Hono");

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    } else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else {
      return () => "";
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (exposeHeadersStr) {
      set("Access-Control-Expose-Headers", exposeHeadersStr);
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) {
        set("Access-Control-Allow-Methods", allowMethods);
      }
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
        }
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/mcp/protocol.ts
var MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
};

// node_modules/uuid/dist/esm-browser/rng.js
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
  }
  return getRandomValues(rnds8);
}
__name(rng, "rng");

// node_modules/uuid/dist/esm-browser/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}
__name(unsafeStringify, "unsafeStringify");

// node_modules/uuid/dist/esm-browser/native.js
var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var native_default = {
  randomUUID
};

// node_modules/uuid/dist/esm-browser/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
__name(v4, "v4");
var v4_default = v4;

// src/db/queries.ts
async function listServers(db, tag, onlyEnabled) {
  let query = "SELECT * FROM servers";
  const conditions = [];
  const params = [];
  if (tag) {
    conditions.push("tags LIKE ?");
    params.push(`%"${tag}"%`);
  }
  if (onlyEnabled) {
    conditions.push("enabled = 1");
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY created_at DESC";
  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}
__name(listServers, "listServers");
async function getServerById(db, id) {
  const result = await db.prepare("SELECT * FROM servers WHERE id = ?").bind(id).first();
  return result ?? null;
}
__name(getServerById, "getServerById");
async function getServerByHost(db, host) {
  const result = await db.prepare("SELECT * FROM servers WHERE host = ? LIMIT 1").bind(host).first();
  return result ?? null;
}
__name(getServerByHost, "getServerByHost");
async function createServer(db, data) {
  const id = v4_default();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    INSERT INTO servers (id, name, vendor_url, host, port, username, auth_method, key_path, key_content, password,
      v2ray_available, direct_when_proxy_available, direct_when_no_proxy,
      gpu_model, gpu_memory_gb, gpu_count, cpu_cores, ram_gb, disk_gb,
      default_proxy_id, tags, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.name,
    data.vendor_url,
    data.host,
    data.port,
    data.username,
    data.auth_method,
    data.key_path,
    data.key_content,
    data.password,
    data.v2ray_available,
    data.direct_when_proxy_available,
    data.direct_when_no_proxy,
    data.gpu_model,
    data.gpu_memory_gb,
    data.gpu_count,
    data.cpu_cores,
    data.ram_gb,
    data.disk_gb,
    data.default_proxy_id,
    data.tags,
    data.notes,
    now,
    now
  ).run();
  return id;
}
__name(createServer, "createServer");
async function updateServer(db, id, updates) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const sets = ["updated_at = ?"];
  const params = [now];
  for (const [key, value] of Object.entries(updates)) {
    if (value !== void 0) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  params.push(id);
  const sql = `UPDATE servers SET ${sets.join(", ")} WHERE id = ?`;
  const result = await db.prepare(sql).bind(...params).run();
  return result.success;
}
__name(updateServer, "updateServer");
async function deleteServer(db, id) {
  const result = await db.prepare("DELETE FROM servers WHERE id = ?").bind(id).run();
  return result.success;
}
__name(deleteServer, "deleteServer");
async function queryServersByAbility(db, filters) {
  const conditions = [];
  const params = [];
  if (filters.gpu_model) {
    conditions.push("gpu_model = ?");
    params.push(filters.gpu_model);
  }
  if (filters.min_ram_gb !== void 0) {
    conditions.push("ram_gb >= ?");
    params.push(filters.min_ram_gb);
  }
  if (filters.min_cpu_cores !== void 0) {
    conditions.push("cpu_cores >= ?");
    params.push(filters.min_cpu_cores);
  }
  if (filters.min_disk_gb !== void 0) {
    conditions.push("disk_gb >= ?");
    params.push(filters.min_disk_gb);
  }
  if (filters.status_online !== void 0) {
    conditions.push("status_online = ?");
    params.push(filters.status_online ? 1 : 0);
  }
  conditions.push("enabled = 1");
  params.push(1);
  const where = "WHERE " + conditions.join(" AND ");
  const sql = `SELECT * FROM servers ${where} ORDER BY created_at DESC`;
  const result = await db.prepare(sql).bind(...params).all();
  return result.results;
}
__name(queryServersByAbility, "queryServersByAbility");
async function listProxies(db) {
  const result = await db.prepare("SELECT * FROM proxies ORDER BY created_at DESC").all();
  return result.results;
}
__name(listProxies, "listProxies");
async function getProxyById(db, id) {
  const result = await db.prepare("SELECT * FROM proxies WHERE id = ?").bind(id).first();
  return result ?? null;
}
__name(getProxyById, "getProxyById");
async function createProxy(db, data) {
  const id = v4_default();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    INSERT INTO proxies (id, name, host, port, username, password, location, protocol, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.name, data.host, data.port, data.username, data.password, data.location, data.protocol, now, now).run();
  return id;
}
__name(createProxy, "createProxy");
async function updateProxy(db, id, updates) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const sets = ["updated_at = ?"];
  const params = [now];
  for (const [key, value] of Object.entries(updates)) {
    if (value !== void 0) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  params.push(id);
  const result = await db.prepare(`UPDATE proxies SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  return result.success;
}
__name(updateProxy, "updateProxy");
async function deleteProxy(db, id) {
  const result = await db.prepare("DELETE FROM proxies WHERE id = ?").bind(id).run();
  return result.success;
}
__name(deleteProxy, "deleteProxy");
async function getReachability(db, serverId) {
  const result = await db.prepare(`
    SELECT r.*, p.name as proxy_name, p.host as proxy_host, p.port as proxy_port, p.protocol as proxy_protocol
    FROM proxy_server_reachability r
    JOIN proxies p ON r.proxy_id = p.id
    WHERE r.server_id = ?
    ORDER BY r.latency_ms ASC
  `).bind(serverId).all();
  return result.results;
}
__name(getReachability, "getReachability");
async function upsertReachability(db, proxyId, serverId, reachable, latencyMs) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    INSERT INTO proxy_server_reachability (proxy_id, server_id, reachable, latency_ms, last_tested_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(proxy_id, server_id) DO UPDATE SET
      reachable = excluded.reachable,
      latency_ms = excluded.latency_ms,
      last_tested_at = excluded.last_tested_at
  `).bind(proxyId, serverId, reachable ? 1 : 0, latencyMs, now).run();
}
__name(upsertReachability, "upsertReachability");
async function recordUsage(db, data) {
  const id = v4_default();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    INSERT INTO usage_logs (id, server_id, agent_id, session_id, action, called_at, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.server_id, data.agent_id, data.session_id, data.action, now, data.details ?? null).run();
  return id;
}
__name(recordUsage, "recordUsage");
async function getUsageLogs(db, serverId, agentId, limit = 50) {
  const conditions = [];
  const params = [];
  if (serverId) {
    conditions.push("server_id = ?");
    params.push(serverId);
  }
  if (agentId) {
    conditions.push("agent_id = ?");
    params.push(agentId);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await db.prepare(
    `SELECT * FROM usage_logs ${where} ORDER BY called_at DESC LIMIT ?`
  ).bind(...params, limit).all();
  return result.results;
}
__name(getUsageLogs, "getUsageLogs");
async function updateServerTask(db, serverId, task) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    UPDATE servers SET current_task = ?, current_agent = ?, task_started_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(task.task, task.agent, now, now, serverId).run();
}
__name(updateServerTask, "updateServerTask");
async function releaseServerTask(db, serverId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    UPDATE servers SET current_task = NULL, current_agent = NULL, task_started_at = NULL, updated_at = ?
    WHERE id = ?
  `).bind(now, serverId).run();
}
__name(releaseServerTask, "releaseServerTask");
async function updateServerStatus(db, serverId, status) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    UPDATE servers SET status_online = ?, status_last_check = ?, status_ping_ms = ?, status_error = ?, updated_at = ?
    WHERE id = ?
  `).bind(status.online ? 1 : 0, now, status.ping_ms, status.error ?? null, now, serverId).run();
}
__name(updateServerStatus, "updateServerStatus");
async function setServerEnabled(db, serverId, enabled) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare("UPDATE servers SET enabled = ?, updated_at = ? WHERE id = ?").bind(enabled ? 1 : 0, now, serverId).run();
}
__name(setServerEnabled, "setServerEnabled");
async function getServerNotes(db, serverIds) {
  if (serverIds.length === 0)
    return {};
  const placeholders = serverIds.map(() => "?").join(",");
  const result = await db.prepare(
    `SELECT * FROM server_notes WHERE server_id IN (${placeholders}) ORDER BY updated_at DESC`
  ).bind(...serverIds).all();
  const map = {};
  for (const n of result.results) {
    (map[n.server_id] ??= []).push(n);
  }
  return map;
}
__name(getServerNotes, "getServerNotes");
async function upsertServerNote(db, serverId, entry) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(`
    INSERT INTO server_notes (server_id, topic, content, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(server_id, topic) DO UPDATE SET
      content = excluded.content,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).bind(serverId, entry.topic, entry.content, entry.updated_by ?? null, now).run();
}
__name(upsertServerNote, "upsertServerNote");

// src/models/server.ts
function renderConnectionMode(p) {
  if (p.v2ray_available && p.direct_when_proxy_available)
    return "\u{1F513} \u76F4\u8FDE\uFF08\u6709V2RayN\u65F6\u53EF\u76F4\u8FDE\uFF09";
  if (p.v2ray_available && !p.direct_when_proxy_available)
    return "\u{1F512} SOCKS5 \u4EE3\u7406\uFF08\u6709V2RayN\u65F6\u8D70\u4EE3\u7406\uFF09";
  if (!p.v2ray_available && p.direct_when_no_proxy)
    return "\u{1F513} \u76F4\u8FDE\uFF08\u65E0\u4EE3\u7406\u65F6\u76F4\u8FDE\u7269\u7406\u7F51\u5361\uFF09";
  if (!p.v2ray_available && !p.direct_when_no_proxy)
    return "\u{1F512} SOCKS5 \u4EE3\u7406\uFF08\u65E0\u4EE3\u7406\u65F6\u8D70\u4EE3\u7406\uFF09";
  return "\u26A0\uFE0F \u914D\u7F6E\u672A\u5B8C\u6210";
}
__name(renderConnectionMode, "renderConnectionMode");
function dbServerToDetail(db, reachableProxies) {
  const proxy = {
    v2ray_available: db.v2ray_available === 1,
    direct_when_proxy_available: db.direct_when_proxy_available === 1,
    direct_when_no_proxy: db.direct_when_no_proxy === 1
  };
  return {
    id: db.id,
    name: db.name,
    vendor_url: db.vendor_url,
    host: db.host,
    port: db.port,
    username: db.username,
    auth_method: db.auth_method,
    key_content: db.key_content,
    password: db.password,
    proxy,
    capabilities: {
      gpu_model: db.gpu_model ?? void 0,
      gpu_memory_gb: db.gpu_memory_gb ?? void 0,
      cpu_cores: db.cpu_cores ?? void 0,
      ram_gb: db.ram_gb ?? void 0,
      disk_gb: db.disk_gb ?? void 0
    },
    connection_mode_label: renderConnectionMode(proxy),
    status_online: db.status_online === 1,
    status_last_check: db.status_last_check,
    status_ping_ms: db.status_ping_ms,
    status_error: db.status_error,
    default_proxy_id: db.default_proxy_id,
    reachable_proxies: reachableProxies ?? [],
    tags: db.tags ? JSON.parse(db.tags) : [],
    task: {
      current_task: db.current_task,
      current_agent: db.current_agent,
      task_started_at: db.task_started_at,
      is_busy: db.current_agent !== null
    },
    notes: db.notes,
    enabled: db.enabled === 1,
    created_at: db.created_at,
    updated_at: db.updated_at
  };
}
__name(dbServerToDetail, "dbServerToDetail");

// src/orchestration/load.ts
function loadAgeSec(db, now) {
  if (!db.load_updated_at)
    return null;
  const ms = Date.parse(now) - Date.parse(db.load_updated_at);
  return ms > 0 ? Math.floor(ms / 1e3) : 0;
}
__name(loadAgeSec, "loadAgeSec");
function resolveCapacity(db, now) {
  const stale = db.load_updated_at === null;
  if (!stale) {
    const freeCards = (db.gpu_count ?? 0) - (db.running_tasks ?? 0);
    return {
      server_id: db.id,
      name: db.name,
      gpu_count: Math.max(0, freeCards),
      gpu_mem_gb: db.gpu_mem_free_gb ?? (db.gpu_count ?? 0) * (db.gpu_memory_gb ?? 0),
      ram_gb: db.ram_free_gb ?? db.ram_gb ?? 0,
      disk_gb: db.disk_free_gb ?? db.disk_gb ?? 0,
      cpu_cores: db.cpu_cores ?? 0,
      stale: false
    };
  }
  return {
    server_id: db.id,
    name: db.name,
    gpu_count: db.gpu_count ?? 0,
    gpu_mem_gb: (db.gpu_count ?? 0) * (db.gpu_memory_gb ?? 0),
    ram_gb: db.ram_gb ?? 0,
    disk_gb: db.disk_gb ?? 0,
    cpu_cores: db.cpu_cores ?? 0,
    stale: true
  };
}
__name(resolveCapacity, "resolveCapacity");

// src/mcp/tools/get_servers.ts
function encodeKeyB64(keyContent) {
  if (!keyContent)
    return null;
  return btoa(keyContent);
}
__name(encodeKeyB64, "encodeKeyB64");
var getServersTool = {
  definition: {
    name: "get_servers",
    description: "\u4E00\u6B65\u83B7\u53D6\u53EF\u7528GPU\u670D\u52A1\u5668\u53CA\u5176\u5B8C\u6574\u8FDE\u63A5\u4FE1\u606F\u3002\u4E0D\u5E26\u53C2\u6570\u8FD4\u56DE\u6240\u6709\u5728\u7EBF\u670D\u52A1\u5668\uFF1B\u53EF\u6309 gpu_model / \u6700\u4F4E\u914D\u7F6E / \u6807\u7B7E\u8FC7\u6EE4\u3002\u6BCF\u53F0\u670D\u52A1\u5668\u8FD4\u56DE\u4E3B\u673A\u3001\u7AEF\u53E3\u3001\u7528\u6237\u540D\u3001\u8BA4\u8BC1\u65B9\u5F0F\u3001SSH\u5BC6\u94A5(\u5355\u884Cbase64,\u4E0D\u542B\u6362\u884C)\u3001\u8FDE\u63A5\u65B9\u5F0F\u6807\u7B7E\u548C\u53EF\u8FBE\u4EE3\u7406\u3002\u54CD\u5E94\u9876\u90E8\u7684 how_to_connect \u8BF4\u660E\u5982\u4F55\u7528\u8FD9\u4E9B\u4FE1\u606F\u5EFA\u7ACBSSH\u8FDE\u63A5\u3002\u9700\u8981\u670D\u52A1\u5668\u65F6\u8C03\u7528\u8FD9\u4E00\u4E2A\u5DE5\u5177\u5373\u53EF\uFF0C\u65E0\u9700\u591A\u6B65\u3002",
    inputSchema: {
      type: "object",
      properties: {
        gpu_model: { type: "string", description: '\u6309GPU\u578B\u53F7\u7CBE\u786E\u8FC7\u6EE4\uFF0C\u5982 "NVIDIA A100"\u3002\u7559\u7A7A\u4E0D\u9650\u3002' },
        min_gpu_memory_gb: { type: "number", description: "\u6700\u4F4E\u5355\u5361\u663E\u5B58(GB)\u3002" },
        min_ram_gb: { type: "number", description: "\u6700\u4F4E\u5185\u5B58(GB)\u3002" },
        min_cpu_cores: { type: "number", description: "\u6700\u4F4ECPU\u6838\u5FC3\u6570\u3002" },
        tag: { type: "string", description: '\u6309\u6807\u7B7E\u8FC7\u6EE4\uFF0C\u5982 "training"\u3002' },
        include_offline: { type: "boolean", default: false, description: "\u662F\u5426\u5305\u542B\u79BB\u7EBF\u670D\u52A1\u5668\u3002\u9ED8\u8BA4false\uFF0C\u53EA\u8FD4\u56DE\u5728\u7EBF\u7684\u3002" }
      }
    }
  },
  execute: async (args, { db }) => {
    const gpuModel = args.gpu_model;
    const minGpuMemoryGb = args.min_gpu_memory_gb;
    const minRamGb = args.min_ram_gb;
    const minCpuCores = args.min_cpu_cores;
    const tag = args.tag;
    const includeOffline = args.include_offline === true;
    let servers = await queryServersByAbility(db, {
      gpu_model: gpuModel,
      min_ram_gb: minRamGb,
      min_cpu_cores: minCpuCores,
      status_online: includeOffline ? void 0 : true
    });
    if (minGpuMemoryGb !== void 0) {
      servers = servers.filter((s) => s.gpu_memory_gb !== null && s.gpu_memory_gb >= minGpuMemoryGb);
    }
    if (tag) {
      servers = servers.filter((s) => {
        if (!s.tags)
          return false;
        try {
          return JSON.parse(s.tags).includes(tag);
        } catch {
          return false;
        }
      });
    }
    const ids = servers.map((s) => s.id);
    const notesMap = await getServerNotes(db, ids);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const enriched = await Promise.all(servers.map(async (s) => {
      const reachable = await getReachability(db, s.id);
      return {
        id: s.id,
        name: s.name,
        host: s.host,
        port: s.port,
        username: s.username,
        auth_method: s.auth_method,
        key_path: s.key_path,
        key_content_b64: encodeKeyB64(s.key_content),
        password: s.password,
        connection_mode_label: renderConnectionMode({
          v2ray_available: s.v2ray_available === 1,
          direct_when_proxy_available: s.direct_when_proxy_available === 1,
          direct_when_no_proxy: s.direct_when_no_proxy === 1
        }),
        gpu_model: s.gpu_model,
        gpu_memory_gb: s.gpu_memory_gb,
        cpu_cores: s.cpu_cores,
        ram_gb: s.ram_gb,
        disk_gb: s.disk_gb,
        online: s.status_online === 1,
        ping_ms: s.status_ping_ms,
        tags: s.tags ? JSON.parse(s.tags) : [],
        notes: s.notes,
        gpu_count: s.gpu_count,
        gpu_util_pct: s.gpu_util_pct,
        gpu_mem_free_gb: s.gpu_mem_free_gb,
        ram_free_gb: s.ram_free_gb,
        disk_free_gb: s.disk_free_gb,
        running_tasks: s.running_tasks,
        load_age_sec: loadAgeSec(s, now),
        notes_entries: (notesMap[s.id] ?? []).map((n) => ({
          topic: n.topic,
          content: n.content,
          updated_by: n.updated_by,
          updated_at: n.updated_at
        })),
        reachable_proxies: reachable.filter((r) => r.reachable === 1).map((r) => ({ id: r.proxy_id, name: r.proxy_name, host: r.proxy_host, port: r.proxy_port, protocol: r.proxy_protocol, latency_ms: r.latency_ms }))
      };
    }));
    const how_to_connect = 'key\u8BA4\u8BC1: key_content_b64 \u662F\u5355\u884Cbase64\u7684SSH\u79C1\u94A5(\u65E0\u6362\u884C,\u6297\u538B\u7F29)\u3002echo "<key_content_b64>" | base64 -d > /tmp/dsh_<id> && chmod 600 /tmp/dsh_<id>\uFF0C\u7136\u540E ssh -i /tmp/dsh_<id> <username>@<host> -p <port>\u3002\u82E5\u672C\u673A key_path \u6587\u4EF6\u5DF2\u5B58\u5728\u53EF\u76F4\u63A5 ssh -i <key_path>\u3002password\u8BA4\u8BC1: \u7528 password \u5B57\u6BB5\u76F4\u63A5\u767B\u5F55\u3002\u82E5 connection_mode_label \u542B"\u4EE3\u7406"\u6216\u76F4\u8FDE\u4E0D\u901A\uFF0C\u7528 reachable_proxies \u4E2D\u5EF6\u8FDF\u6700\u4F4E\u7684\u4EE3\u7406: ssh -o ProxyCommand="nc -X 5 -x <proxy.host>:<proxy.port> %h %p" -i <key> <username>@<host> -p <port>\u3002\u8FD0\u7EF4\u77E5\u8BC6\u89C1 notes_entries(\u6309 topic),\u5982 global_proxy \u7684\u7528\u6CD5/\u6CE8\u610F\u4E8B\u9879\u3002';
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ how_to_connect, count: enriched.length, servers: enriched })
      }]
    };
  }
};

// src/mcp/tools/upsert_server.ts
var upsertServerTool = {
  definition: {
    name: "upsert_server",
    description: "\u6309IP\u5730\u5740(host)\u767B\u8BB0\u670D\u52A1\u5668\uFF1A\u82E5\u5DF2\u5B58\u5728\u540Chost\u7684\u670D\u52A1\u5668\u5219\u66F4\u65B0\u5176\u4FE1\u606F\uFF0C\u5426\u5219\u521B\u5EFA\u65B0\u670D\u52A1\u5668\u3002host \u662F\u552F\u4E00\u67E5\u91CD\u4F9D\u636E\u3002\u9002\u5408agent\u5728\u914D\u597D\u56FA\u5B9A\u670D\u52A1\u5668\u73AF\u5883\u540E\uFF0C\u628A\u6700\u65B0\u914D\u7F6E(\u786C\u4EF6\u3001\u5BC6\u94A5\u3001\u8FDE\u63A5\u65B9\u5F0F)\u4E00\u6B21\u6027\u540C\u6B65\u5230MCP\uFF0C\u65E0\u9700\u5148\u67E5ID\u3002\u8FD4\u56DE server_id \u548C created(true=\u65B0\u5EFA/false=\u66F4\u65B0)\u3002",
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", description: "\u670D\u52A1\u5668IP\u5730\u5740\u6216\u57DF\u540D\u3002\u552F\u4E00\u67E5\u91CD\u952E\u2014\u2014\u76F8\u540Chost\u89C6\u4E3A\u540C\u4E00\u53F0\u3002" },
        name: { type: "string", description: "\u670D\u52A1\u5668\u540D\u79F0\u3002\u65B0\u5EFA\u65F6\u5FC5\u586B\uFF1B\u66F4\u65B0\u65F6\u53EF\u9009\u3002" },
        port: { type: "number", default: 22, description: "SSH\u7AEF\u53E3\uFF0C\u9ED8\u8BA422\u3002" },
        username: { type: "string", description: "SSH\u767B\u5F55\u7528\u6237\u540D\u3002\u65B0\u5EFA\u65F6\u5FC5\u586B\u3002" },
        auth_method: { type: "string", enum: ["key", "password"], description: "\u8BA4\u8BC1\u65B9\u5F0F\u3002\u65B0\u5EFA\u65F6\u5FC5\u586B\u3002" },
        key_path: { type: "string", description: "SSH\u79C1\u94A5\u5728\u672C\u673A\u7684\u8DEF\u5F84\uFF08\u53EF\u9009\uFF09\u3002" },
        key_content: { type: "string", description: "SSH\u79C1\u94A5\u660E\u6587\uFF08key\u8BA4\u8BC1\uFF09\u3002\u670D\u52A1\u7AEF\u539F\u6837\u5B58\u50A8\uFF0Cget_servers \u8FD4\u56DE\u65F6\u8F6C\u5355\u884Cbase64\u3002" },
        password: { type: "string", description: "SSH\u5BC6\u7801\uFF08password\u8BA4\u8BC1\uFF09\u3002" },
        vendor_url: { type: "string", description: "\u4F9B\u5E94\u5546\u5B9E\u4F8B\u94FE\u63A5\uFF08\u53EF\u9009\uFF09\u3002" },
        v2ray_available: { type: "boolean", description: "\u662F\u5426\u5B89\u88C5V2RayN\u3002" },
        direct_when_proxy_available: { type: "boolean", description: "\u6709V2RayN\u65F6\u662F\u5426\u5141\u8BB8\u76F4\u8FDE\u3002" },
        direct_when_no_proxy: { type: "boolean", description: "\u65E0\u4EE3\u7406\u65F6\u662F\u5426\u5141\u8BB8\u76F4\u8FDE\u7269\u7406\u7F51\u5361\u3002" },
        gpu_model: { type: "string", description: "GPU\u578B\u53F7\u3002" },
        gpu_memory_gb: { type: "number", description: "\u5355\u5361\u663E\u5B58(GB)\u3002" },
        cpu_cores: { type: "number", description: "CPU\u6838\u5FC3\u6570\u3002" },
        ram_gb: { type: "number", description: "\u5185\u5B58(GB)\u3002" },
        disk_gb: { type: "number", description: "\u78C1\u76D8(GB)\u3002" },
        default_proxy_id: { type: "string", description: "\u9ED8\u8BA4\u4EE3\u7406ID\uFF08\u53EF\u9009\uFF09\u3002" },
        tags: { type: "array", items: { type: "string" }, description: "\u6807\u7B7E\u5217\u8868\u3002" },
        notes: { type: "string", description: "\u5907\u6CE8\u3002" },
        gpu_count: { type: "number", description: "GPU\u5361\u6570(\u9759\u6001\u5BB9\u91CF)\u3002" },
        gpu_util_pct: { type: "number", description: "GPU\u5229\u7528\u73870-100(\u8D1F\u8F7D\u5FEB\u7167)\u3002" },
        gpu_mem_free_gb: { type: "number", description: "\u7A7A\u95F2\u663E\u5B58GB(\u8D1F\u8F7D\u5FEB\u7167)\u3002" },
        ram_free_gb: { type: "number", description: "\u7A7A\u95F2\u5185\u5B58GB(\u8D1F\u8F7D\u5FEB\u7167)\u3002" },
        disk_free_gb: { type: "number", description: "\u7A7A\u95F2\u78C1\u76D8GB(\u8D1F\u8F7D\u5FEB\u7167)\u3002" },
        running_tasks: { type: "number", description: "\u5F53\u524D\u8FD0\u884C\u4EFB\u52A1\u6570(\u8D1F\u8F7D\u5FEB\u7167)\u3002" },
        agent: { type: "string", description: "\u6267\u884C\u56DE\u5199\u7684agent\u6807\u8BC6(\u7528\u4E8Enotes_entry.updated_by)\u3002" },
        notes_entry: {
          type: "object",
          description: "\u6309topic\u589E\u91CF\u5199\u5165\u8FD0\u7EF4\u77E5\u8BC6\u3002\u540Ctopic\u8986\u76D6,\u4E0D\u540Ctopic\u5E76\u5B58\u3002",
          properties: {
            topic: { type: "string", description: '\u5982 "global_proxy"\u3001"cuda_env"\u3001"disk_mount"\u3002' },
            content: { type: "string", description: "\u8BE5\u914D\u7F6E\u7684\u7528\u6CD5/\u6CE8\u610F\u4E8B\u9879\u3002" }
          },
          required: ["topic", "content"]
        }
      },
      required: ["host"]
    }
  },
  execute: async (args, { db }) => {
    const host = args.host;
    const existing = await getServerByHost(db, host);
    const boolToInt = /* @__PURE__ */ __name((v) => v === true ? 1 : v === false ? 0 : void 0, "boolToInt");
    const fields = {
      name: args.name,
      port: args.port,
      username: args.username,
      auth_method: args.auth_method,
      key_path: args.key_path,
      key_content: args.key_content,
      password: args.password,
      vendor_url: args.vendor_url,
      v2ray_available: boolToInt(args.v2ray_available),
      direct_when_proxy_available: boolToInt(args.direct_when_proxy_available),
      direct_when_no_proxy: boolToInt(args.direct_when_no_proxy),
      gpu_model: args.gpu_model,
      gpu_memory_gb: args.gpu_memory_gb,
      cpu_cores: args.cpu_cores,
      ram_gb: args.ram_gb,
      disk_gb: args.disk_gb,
      default_proxy_id: args.default_proxy_id,
      notes: args.notes,
      gpu_count: args.gpu_count,
      gpu_util_pct: args.gpu_util_pct,
      gpu_mem_free_gb: args.gpu_mem_free_gb,
      ram_free_gb: args.ram_free_gb,
      disk_free_gb: args.disk_free_gb,
      running_tasks: args.running_tasks,
      tags: Array.isArray(args.tags) ? JSON.stringify(args.tags) : void 0
    };
    const loadProvided = ["gpu_util_pct", "gpu_mem_free_gb", "ram_free_gb", "disk_free_gb", "running_tasks"].some((k) => args[k] !== void 0);
    if (existing) {
      const updates = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== void 0)
          updates[k] = v;
      }
      if (loadProvided)
        updates.load_updated_at = (/* @__PURE__ */ new Date()).toISOString();
      const success = await updateServer(db, existing.id, updates);
      if (args.notes_entry) {
        await upsertServerNote(db, existing.id, {
          topic: args.notes_entry.topic,
          content: args.notes_entry.content,
          updated_by: args.agent ?? void 0
        });
      }
      return { content: [{ type: "text", text: JSON.stringify({ server_id: existing.id, created: false, success }) }] };
    }
    const missing = ["name", "username", "auth_method"].filter((k) => !args[k]);
    if (missing.length > 0) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: `\u65B0\u5EFA\u670D\u52A1\u5668\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5: ${missing.join(", ")}` }) }],
        isError: true
      };
    }
    const id = await createServer(db, {
      name: args.name,
      vendor_url: args.vendor_url ?? null,
      host,
      port: args.port ?? 22,
      username: args.username,
      auth_method: args.auth_method,
      key_path: args.key_path ?? null,
      key_content: args.key_content ?? null,
      password: args.password ?? null,
      v2ray_available: boolToInt(args.v2ray_available) ?? 0,
      direct_when_proxy_available: boolToInt(args.direct_when_proxy_available) ?? 0,
      direct_when_no_proxy: boolToInt(args.direct_when_no_proxy) ?? 0,
      gpu_model: args.gpu_model ?? null,
      gpu_memory_gb: args.gpu_memory_gb ?? null,
      gpu_count: args.gpu_count ?? null,
      cpu_cores: args.cpu_cores ?? null,
      ram_gb: args.ram_gb ?? null,
      disk_gb: args.disk_gb ?? null,
      default_proxy_id: args.default_proxy_id ?? null,
      notes: args.notes ?? null,
      tags: Array.isArray(args.tags) ? JSON.stringify(args.tags) : null
    });
    if (args.notes_entry) {
      await upsertServerNote(db, id, {
        topic: args.notes_entry.topic,
        content: args.notes_entry.content,
        updated_by: args.agent ?? void 0
      });
    }
    return { content: [{ type: "text", text: JSON.stringify({ server_id: id, created: true }) }] };
  }
};

// src/mcp/tools/update_server.ts
var updateServerTool = {
  definition: {
    name: "update_server",
    description: "\u66F4\u65B0\u670D\u52A1\u5668\u5B57\u6BB5\u3002\u4F20\u5165 updates \u5BF9\u8C61\uFF0C\u53EA\u6539\u4F20\u5165\u7684\u5B57\u6BB5\u3002\u53EF\u7528\u5B57\u6BB5\uFF1Aname, host, port, username, auth_method, key_path, key_content(\u660E\u6587), password, vendor_url, v2ray_available, direct_when_proxy_available, direct_when_no_proxy, gpu_model, gpu_memory_gb, cpu_cores, ram_gb, disk_gb, default_proxy_id, tags, notes, enabled(1\u663E\u793A/0\u9690\u85CF)\u3002\u4E5F\u7528\u4E8E\u4FDD\u5B58SSH\u68C0\u6D4B\u5230\u7684\u786C\u4EF6\u4FE1\u606F\u6216\u4E34\u65F6\u4E0A\u4E0B\u67B6\u670D\u52A1\u5668\u3002",
    inputSchema: {
      type: "object",
      properties: {
        server_id: { type: "string", description: "\u670D\u52A1\u5668ID\uFF08\u6765\u81EA get_servers\uFF09\u3002" },
        updates: {
          type: "object",
          description: "\u8981\u66F4\u65B0\u7684\u5B57\u6BB5\u96C6\u5408\uFF0C\u53EA\u4F20\u9700\u8981\u4FEE\u6539\u7684\u3002",
          properties: {
            name: { type: "string" },
            host: { type: "string" },
            port: { type: "number" },
            username: { type: "string" },
            auth_method: { type: "string", enum: ["key", "password"] },
            key_content: { type: "string", description: "SSH\u79C1\u94A5\u660E\u6587\uFF08\u670D\u52A1\u7AEF\u539F\u6837\u5B58\u50A8\uFF09\u3002" },
            gpu_model: { type: "string" },
            gpu_memory_gb: { type: "number" },
            cpu_cores: { type: "number" },
            ram_gb: { type: "number" },
            disk_gb: { type: "number" },
            tags: { type: "array", items: { type: "string" } },
            enabled: { type: "number", enum: [0, 1], description: "1=\u663E\u793A\u7ED9MCP\uFF0C0=\u9690\u85CF\u3002" }
          }
        }
      },
      required: ["server_id", "updates"]
    }
  },
  execute: async (args, { db }) => {
    const updates = { ...args.updates };
    if (Array.isArray(updates.tags))
      updates.tags = JSON.stringify(updates.tags);
    const success = await updateServer(db, args.server_id, updates);
    return { content: [{ type: "text", text: JSON.stringify({ success }) }] };
  }
};

// src/mcp/tools/remove_server.ts
var removeServerTool = {
  definition: {
    name: "remove_server",
    description: "\u4ECE\u96C6\u7FA4\u4E2D\u5220\u9664\u4E00\u53F0\u670D\u52A1\u5668\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u9006\uFF0C\u4F1A\u6C38\u4E45\u5220\u9664\u670D\u52A1\u5668\u8BB0\u5F55\u53CA\u6240\u6709\u7684\u53EF\u8FBE\u6027\u7F13\u5B58\u6570\u636E\u3002\u5220\u9664\u524D\u8BF7\u5148\u786E\u8BA4\u7528\u6237\u610F\u56FE\u3002server_id \u4ECE list_servers \u83B7\u53D6\u3002",
    inputSchema: {
      type: "object",
      properties: {
        server_id: { type: "string", description: "\u8981\u5220\u9664\u7684\u670D\u52A1\u5668ID\u2014\u2014\u4ECE list_servers \u8FD4\u56DE\u7684 id \u5B57\u6BB5\u83B7\u53D6\u3002\u683C\u5F0F\u4E3A UUID\u3002" }
      },
      required: ["server_id"]
    }
  },
  execute: async (args, { db }) => {
    const success = await deleteServer(db, args.server_id);
    return { content: [{ type: "text", text: JSON.stringify({ success }) }] };
  }
};

// src/probe/ping.ts
import { connect } from "cloudflare:sockets";
async function tcpPing(host, port, timeoutMs = 3e3) {
  const startTime = Date.now();
  try {
    const socket = connect({ hostname: host, port });
    await socket.opened;
    const latencyMs = Date.now() - startTime;
    socket.close();
    return { reachable: true, latency_ms: latencyMs };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return { reachable: false, latency_ms: elapsed, error: `TCP ping failed: ${err}` };
  }
}
__name(tcpPing, "tcpPing");
async function grabSSHBanner(host, port, timeoutMs = 5e3) {
  const startTime = Date.now();
  let socket;
  try {
    socket = connect({ hostname: host, port });
    await socket.opened;
    const reader = socket.readable.getReader();
    const timer = setTimeout(() => {
      try {
        reader.cancel("timeout");
      } catch {
      }
    }, timeoutMs);
    const chunks = [];
    let total = 0;
    while (total < 512) {
      const { done, value } = await reader.read();
      if (done)
        break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
      if (value && value[value.length - 1] === 10)
        break;
    }
    clearTimeout(timer);
    reader.releaseLock();
    const latencyMs = Date.now() - startTime;
    socket.close();
    if (total === 0) {
      return { reachable: true, latency_ms: latencyMs, error: "SSH banner not received (connection closed immediately)" };
    }
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const banner = new TextDecoder().decode(combined).trim();
    const sshVersionMatch = banner.match(/SSH-[\d.]+-([^\s]+)/);
    const sshVersion = sshVersionMatch ? sshVersionMatch[1] : void 0;
    let osHint;
    if (banner.includes("Ubuntu"))
      osHint = "Ubuntu";
    else if (banner.includes("Debian"))
      osHint = "Debian";
    else if (banner.includes("CentOS"))
      osHint = "CentOS";
    else if (banner.includes("RHEL"))
      osHint = "RHEL";
    else if (banner.includes("Fedora"))
      osHint = "Fedora";
    else if (banner.includes("Amazon"))
      osHint = "Amazon Linux";
    else if (banner.match(/OpenSSH.*[Bb]untu/))
      osHint = "Ubuntu";
    else if (banner.includes("Windows"))
      osHint = "Windows";
    else if (banner.includes("dropbear"))
      osHint = "Embedded Linux (Dropbear)";
    return {
      reachable: true,
      latency_ms: latencyMs,
      banner: banner.substring(0, 255),
      ssh_version: sshVersion,
      os_hint: osHint
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    if (socket) {
      try {
        socket.close();
      } catch {
      }
    }
    return { reachable: false, latency_ms: elapsed, error: `SSH banner grab failed: ${err}` };
  }
}
__name(grabSSHBanner, "grabSSHBanner");

// src/probe/socks5.ts
import { connect as connect2 } from "cloudflare:sockets";
async function testViaSocks5(proxyHost, proxyPort, targetHost, targetPort, username, password, timeoutMs = 5e3) {
  const startTime = Date.now();
  try {
    const socket = connect2({ hostname: proxyHost, port: proxyPort });
    await socket.opened;
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    let authBytes;
    if (username) {
      authBytes = new Uint8Array([5, 2, 0, 2]);
    } else {
      authBytes = new Uint8Array([5, 1, 0]);
    }
    await writer.write(authBytes);
    const greetResp = await readWithTimeout(reader, 2, timeoutMs);
    if (!greetResp || greetResp[0] !== 5) {
      return { reachable: false, latency_ms: null, error: "SOCKS5: invalid greeting response" };
    }
    if (greetResp[1] === 2 && username) {
      const passBytes = buildUserPassAuth(username, password ?? "");
      await writer.write(passBytes);
      const authResp = await readWithTimeout(reader, 2, timeoutMs);
      if (!authResp || authResp[0] !== 1 || authResp[1] !== 0) {
        return { reachable: false, latency_ms: null, error: "SOCKS5: auth failed" };
      }
    } else if (greetResp[1] === 255) {
      return { reachable: false, latency_ms: null, error: "SOCKS5: no acceptable auth method" };
    }
    const connectBytes = buildConnectRequest(targetHost, targetPort);
    await writer.write(connectBytes);
    const connectResp = await readWithTimeout(reader, 10, timeoutMs);
    if (!connectResp || connectResp[0] !== 5 || connectResp[1] !== 0) {
      const errorCode = connectResp ? connectResp[1].toString(16) : "unknown";
      return { reachable: false, latency_ms: null, error: `SOCKS5: connect failed (0x${errorCode})` };
    }
    const latencyMs = Date.now() - startTime;
    writer.releaseLock();
    reader.releaseLock();
    socket.close();
    return { reachable: true, latency_ms: latencyMs };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return { reachable: false, latency_ms: elapsed, error: `Connection failed: ${err}` };
  }
}
__name(testViaSocks5, "testViaSocks5");
function buildUserPassAuth(username, password) {
  const u = new TextEncoder().encode(username);
  const p = new TextEncoder().encode(password);
  const buf = new Uint8Array(3 + u.length + p.length);
  buf[0] = 1;
  buf[1] = u.length;
  buf.set(u, 2);
  buf[2 + u.length] = p.length;
  buf.set(p, 3 + u.length);
  return buf;
}
__name(buildUserPassAuth, "buildUserPassAuth");
function buildConnectRequest(host, port) {
  const hostBytes = new TextEncoder().encode(host);
  const buf = new Uint8Array(4 + 1 + hostBytes.length + 2);
  buf[0] = 5;
  buf[1] = 1;
  buf[2] = 0;
  buf[3] = 3;
  buf[4] = hostBytes.length;
  buf.set(hostBytes, 5);
  buf[5 + hostBytes.length] = port >> 8 & 255;
  buf[6 + hostBytes.length] = port & 255;
  return buf;
}
__name(buildConnectRequest, "buildConnectRequest");
async function readWithTimeout(reader, minBytes, timeoutMs) {
  const chunks = [];
  let total = 0;
  const timer = setTimeout(() => {
    reader.cancel("timeout");
  }, timeoutMs);
  try {
    while (total < minBytes) {
      const { done, value } = await reader.read();
      if (done)
        break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    clearTimeout(timer);
    if (total === 0)
      return null;
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } catch {
    clearTimeout(timer);
    return null;
  }
}
__name(readWithTimeout, "readWithTimeout");

// src/mcp/tools/verify_connectivity.ts
var verifyConnectivityTool = {
  definition: {
    name: "verify_server_connectivity",
    description: "\u5BF9\u6307\u5B9A\u670D\u52A1\u5668\u6267\u884C\u5168\u9762\u7684\u8FDE\u901A\u6027\u6D4B\u8BD5\uFF1A1) \u76F4\u8FDESSH\u7AEF\u53E3\u63A2\u6D4B\uFF1B2) \u901A\u8FC7\u6BCF\u4E2A\u4EE3\u7406\u6D4B\u8BD5SSH\u8FDE\u63A5\u3002\u7ED3\u679C\u81EA\u52A8\u66F4\u65B0\u5728\u7EBF\u72B6\u6001\u5E76\u7F13\u5B58\u6BCF\u4E2A\u4EE3\u7406\u7684\u53EF\u8FBE\u6027(\u4F9B get_servers \u8FD4\u56DE)\u3002\u670D\u52A1\u5668\u9700\u5148\u7ECF upsert_server \u767B\u8BB0\u3002",
    inputSchema: {
      type: "object",
      properties: {
        server_id: { type: "string", description: "\u8981\u6D4B\u8BD5\u7684\u670D\u52A1\u5668ID\u2014\u2014\u4ECE list_servers \u8FD4\u56DE\u7684 id \u5B57\u6BB5\u83B7\u53D6\u3002" }
      },
      required: ["server_id"]
    }
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id;
    const server = await getServerById(db, serverId);
    if (!server) {
      return { content: [{ type: "text", text: `\u670D\u52A1\u5668\u672A\u627E\u5230: ${serverId}` }], isError: true };
    }
    const results = [];
    const directPing = await tcpPing(server.host, server.port);
    results.push({
      type: "direct",
      reachable: directPing.reachable,
      latency_ms: directPing.latency_ms,
      error: directPing.error
    });
    if (directPing.reachable) {
      await updateServerStatus(db, serverId, {
        online: true,
        ping_ms: directPing.latency_ms,
        error: void 0
      });
    }
    const proxies = await listProxies(db);
    const proxyResults = [];
    for (const proxy of proxies) {
      let result;
      if (proxy.protocol === "socks5") {
        result = await testViaSocks5(
          proxy.host,
          proxy.port,
          server.host,
          server.port,
          proxy.username ?? void 0,
          proxy.password ?? void 0
        );
      } else {
        result = await tcpPing(server.host, server.port);
      }
      proxyResults.push({
        proxy_id: proxy.id,
        proxy_name: proxy.name,
        ...result
      });
      await upsertReachability(db, proxy.id, serverId, result.reachable, result.latency_ms);
    }
    results.push({
      type: "proxy_tests",
      proxies_tested: proxies.length,
      reachable_count: proxyResults.filter((r) => r.reachable).length,
      proxy_results: proxyResults
    });
    const bestProxy = proxyResults.filter((r) => r.reachable).sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity))[0];
    const directOk = directPing.reachable;
    const anyProxyOk = proxyResults.some((r) => r.reachable);
    let verdict;
    if (directOk && anyProxyOk) {
      verdict = `\u2705 \u670D\u52A1\u5668 ${server.name} \u76F4\u8FDE\u53EF\u8FBE\uFF0C\u4E14\u6709 ${proxyResults.filter((r) => r.reachable).length} \u4E2A\u4EE3\u7406\u53EF\u5230\u8FBE`;
    } else if (directOk) {
      verdict = `\u2705 \u670D\u52A1\u5668 ${server.name} \u76F4\u8FDE\u53EF\u8FBE\uFF0C\u4F46\u6240\u6709\u4EE3\u7406\u5747\u65E0\u6CD5\u5230\u8FBE`;
    } else if (anyProxyOk) {
      verdict = `\u26A0\uFE0F \u670D\u52A1\u5668 ${server.name} \u76F4\u8FDE\u4E0D\u53EF\u8FBE\uFF0C\u4F46\u6709 ${proxyResults.filter((r) => r.reachable).length} \u4E2A\u4EE3\u7406\u53EF\u7528`;
    } else {
      verdict = `\u274C \u670D\u52A1\u5668 ${server.name} \u76F4\u8FDE\u548C\u6240\u6709\u4EE3\u7406\u5747\u4E0D\u53EF\u8FBE`;
    }
    results.push({
      type: "verdict",
      direct_reachable: directOk,
      any_proxy_reachable: anyProxyOk,
      best_proxy: bestProxy ? { proxy_id: bestProxy.proxy_id, name: bestProxy.proxy_name, latency_ms: bestProxy.latency_ms } : null,
      message: verdict
    });
    if (!directOk && anyProxyOk) {
      await updateServerStatus(db, serverId, {
        online: true,
        ping_ms: bestProxy?.latency_ms ?? null,
        error: "Direct unreachable, reachable via proxy"
      });
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ server_id: serverId, server_name: server.name, results }, null, 2)
      }]
    };
  }
};

// src/models/proxy.ts
function dbProxyToNode(db) {
  return {
    id: db.id,
    name: db.name,
    host: db.host,
    port: db.port,
    username: db.username ?? void 0,
    password: db.password ?? void 0,
    location: db.location ?? void 0,
    protocol: db.protocol,
    created_at: db.created_at,
    updated_at: db.updated_at
  };
}
__name(dbProxyToNode, "dbProxyToNode");

// src/mcp/tools/list_proxies.ts
var listProxiesTool = {
  definition: {
    name: "list_proxies",
    description: "\u5217\u51FA\u4EE3\u7406\u6C60\u4E2D\u7684\u6240\u6709\u4EE3\u7406\u8282\u70B9\u3002\u5F53\u4F60\u9700\u8981\u4E86\u89E3\u6709\u54EA\u4E9B SOCKS5/HTTP \u4EE3\u7406\u53EF\u7528\u3001\u67E5\u770B\u4EE3\u7406\u7684\u5730\u5740\u548C\u4F4D\u7F6E\u65F6\u4F7F\u7528\u3002\u8FD4\u56DE\u6BCF\u4E2A\u4EE3\u7406\u7684ID\u3001\u540D\u79F0\u3001\u534F\u8BAE\u7C7B\u578B\u3001\u5730\u5740\u7AEF\u53E3\u548C\u4F4D\u7F6E\u4FE1\u606F\u3002\u4EE3\u7406ID\u5728\u6DFB\u52A0\u670D\u52A1\u5668\u65F6\u53EF\u7528\u4E8E\u8BBE\u7F6E default_proxy_id\uFF0C\u6216\u5728\u6D4B\u8BD5\u8FDE\u901A\u6027\u65F6\u6307\u5B9A\u3002",
    inputSchema: { type: "object", properties: {} }
  },
  execute: async (_, { db }) => {
    const proxies = await listProxies(db);
    const nodes = proxies.map(dbProxyToNode);
    return { content: [{ type: "text", text: JSON.stringify(nodes, null, 2) }] };
  }
};

// src/mcp/tools/add_proxy.ts
var addProxyTool = {
  definition: {
    name: "add_proxy",
    description: "\u5411\u4EE3\u7406\u6C60\u4E2D\u6DFB\u52A0\u4E00\u4E2A\u65B0\u7684\u4EE3\u7406\u8282\u70B9\u3002\u4EE3\u7406\u8282\u70B9\u7528\u4E8E\u4E2D\u8F6CSSH\u8FDE\u63A5\u81F3GPU\u670D\u52A1\u5668\u2014\u2014\u5F53\u670D\u52A1\u5668\u5728\u56FD\u5185\u65E0\u6CD5\u76F4\u63A5\u8BBF\u95EE\u65F6\uFF0C\u901A\u8FC7\u4EE3\u7406\u8282\u70B9\u8FDE\u63A5\u3002\u652F\u6301 SOCKS5 \u548C HTTP \u4EE3\u7406\u534F\u8BAE\u3002\u8FD4\u56DE\u65B0\u4EE3\u7406\u7684UUID\u3002",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: '\u4EE3\u7406\u8282\u70B9\u540D\u79F0\u3002\u4F8B\u5982 "HK-Relay-1"\u3001"JP-Proxy-01"\u3002' },
        host: { type: "string", description: '\u4EE3\u7406\u670D\u52A1\u5668\u5730\u5740\u3002\u4F8B\u5982 "127.0.0.1" \u6216 "proxy.example.com"\u3002' },
        port: { type: "number", default: 1080, description: "\u4EE3\u7406\u7AEF\u53E3\u3002SOCKS5\u9ED8\u8BA41080\uFF0CHTTP\u9ED8\u8BA48080\u3002" },
        username: { type: "string", description: "\u4EE3\u7406\u8BA4\u8BC1\u7528\u6237\u540D\uFF08\u53EF\u9009\uFF09\u3002" },
        password: { type: "string", description: "\u4EE3\u7406\u8BA4\u8BC1\u5BC6\u7801\uFF08\u53EF\u9009\uFF09\u3002" },
        location: { type: "string", description: '\u4EE3\u7406\u8282\u70B9\u5730\u7406\u4F4D\u7F6E\u3002\u4F8B\u5982 "\u9999\u6E2F"\u3001"\u65E5\u672C"\u3001"\u7F8E\u56FD\u897F\u6D77\u5CB8"\u3002\u7528\u4E8E\u6807\u8BC6\u4EE3\u7406\u6240\u5728\u533A\u57DF\u3002' },
        protocol: { type: "string", enum: ["socks5", "http"], default: "socks5", description: '\u4EE3\u7406\u534F\u8BAE\u7C7B\u578B\uFF1A"socks5"\uFF08SOCKS5\u4EE3\u7406\uFF0C\u63A8\u8350\uFF09\u6216 "http"\uFF08HTTP\u4EE3\u7406\uFF09\u3002' }
      },
      required: ["name", "host"]
    }
  },
  execute: async (args, { db }) => {
    const id = await createProxy(db, {
      name: args.name,
      host: args.host,
      port: args.port ?? 1080,
      username: args.username ?? null,
      password: args.password ?? null,
      location: args.location ?? null,
      protocol: args.protocol ?? "socks5"
    });
    return { content: [{ type: "text", text: JSON.stringify({ id }) }] };
  }
};

// src/mcp/tools/remove_proxy.ts
var removeProxyTool = {
  definition: {
    name: "remove_proxy",
    description: "\u4ECE\u4EE3\u7406\u6C60\u4E2D\u5220\u9664\u4E00\u4E2A\u4EE3\u7406\u8282\u70B9\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u9006\u3002\u5982\u679C\u8BE5\u4EE3\u7406\u88AB\u8BBE\u7F6E\u4E3A\u67D0\u670D\u52A1\u5668\u7684 default_proxy_id\uFF0C\u5220\u9664\u540E\u670D\u52A1\u5668\u5C06\u4F7F\u7528\u81EA\u52A8\u9009\u62E9\u903B\u8F91\u3002proxy_id \u4ECE list_proxies \u83B7\u53D6\u3002",
    inputSchema: {
      type: "object",
      properties: {
        proxy_id: { type: "string", description: "\u8981\u5220\u9664\u7684\u4EE3\u7406\u8282\u70B9ID\u2014\u2014\u4ECE list_proxies \u8FD4\u56DE\u7684 id \u5B57\u6BB5\u83B7\u53D6\u3002" }
      },
      required: ["proxy_id"]
    }
  },
  execute: async (args, { db }) => {
    const success = await deleteProxy(db, args.proxy_id);
    return { content: [{ type: "text", text: JSON.stringify({ success }) }] };
  }
};

// src/mcp/tools/refresh_load.ts
var PROBE_COMMANDS = {
  gpu_util_pct: "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | awk '{s+=$1;n++} END{print (n?int(s/n):0)}'",
  gpu_mem_free_gb: "nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits | awk '{s+=$1} END{print int(s/1024)}'",
  ram_free_gb: "free -g | awk '/^Mem:/{print $7}'",
  disk_free_gb: `df -BG / | awk 'NR==2{gsub(/G/,"",$4); print $4}'`,
  running_tasks: "nvidia-smi --query-compute-apps=pid --format=csv,noheader | wc -l"
};
var refreshLoadTool = {
  definition: {
    name: "refresh_load",
    description: "\u83B7\u53D6\u5404\u670D\u52A1\u5668\u7684\u8D1F\u8F7D\u63A2\u6D4B\u547D\u4EE4\u5305,\u7528\u4E8Eagent\u5E76\u53D1SSH\u6267\u884C\u540E\u7528 upsert_server \u56DE\u5199\u5B9E\u65F6\u8D1F\u8F7D(gpu_util_pct/gpu_mem_free_gb/ram_free_gb/disk_free_gb/running_tasks),\u5B9E\u73B0\u8D1F\u8F7D\u5747\u8861\u7684B(\u5B9E\u65F6)\u8DEF\u5F84\u3002\u4E0D\u4F20\u53C2\u5219\u9488\u5BF9\u6240\u6709\u5728\u7EBF\u670D\u52A1\u5668\u3002",
    inputSchema: {
      type: "object",
      properties: {
        server_ids: { type: "array", items: { type: "string" }, description: "\u53EA\u63A2\u6D4B\u8FD9\u4E9B\u670D\u52A1\u5668(\u53EF\u9009)\u3002" },
        gpu_model: { type: "string", description: "\u6309GPU\u578B\u53F7\u8FC7\u6EE4(\u53EF\u9009)\u3002" }
      }
    }
  },
  execute: async (args, { db }) => {
    const serverIds = args.server_ids;
    const gpuModel = args.gpu_model;
    let servers = await queryServersByAbility(db, { gpu_model: gpuModel, status_online: true });
    if (serverIds && serverIds.length > 0) {
      const set = new Set(serverIds);
      servers = servers.filter((s) => set.has(s.id));
    }
    const targets = servers.map((s) => ({
      server_id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
      username: s.username,
      auth_method: s.auth_method,
      key_path: s.key_path,
      key_content_b64: s.key_content ? btoa(s.key_content) : null,
      password: s.password,
      probe_commands: PROBE_COMMANDS
    }));
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          how_to: "\u5BF9\u6BCF\u53F0\u5E76\u53D1SSH\u6267\u884C probe_commands,\u628A\u7ED3\u679C\u7528 upsert_server \u56DE\u5199(gpu_util_pct/gpu_mem_free_gb/ram_free_gb/disk_free_gb/running_tasks),\u7136\u540E get_servers \u6216 plan_task_allocation \u8BFB\u6700\u65B0\u5FEB\u7167\u3002\u5BC6\u94A5\u7528 key_content_b64 \u89E3\u7801: echo <b64> | base64 -d > /tmp/dsh_<id> && chmod 600\u3002",
          count: targets.length,
          targets
        })
      }]
    };
  }
};

// src/orchestration/pack.ts
function taskGpuCount(t) {
  return t.gpu_count ?? 1;
}
__name(taskGpuCount, "taskGpuCount");
function taskTotalVram(t) {
  return (t.min_gpu_memory_gb ?? 0) * taskGpuCount(t);
}
__name(taskTotalVram, "taskTotalVram");
function canFit(rem, t) {
  const cards = taskGpuCount(t);
  if (rem.gpu_count < cards)
    return false;
  if (taskTotalVram(t) > rem.gpu_mem_gb)
    return false;
  if ((t.min_ram_gb ?? 0) > rem.ram_gb)
    return false;
  if ((t.min_disk_gb ?? 0) > rem.disk_gb)
    return false;
  if ((t.min_cpu_cores ?? 0) > rem.cpu_cores)
    return false;
  return true;
}
__name(canFit, "canFit");
function reasonFor(rem, t) {
  const cards = taskGpuCount(t);
  if (rem.gpu_count < cards)
    return `no server with ${cards} free GPU cards`;
  if (taskTotalVram(t) > rem.gpu_mem_gb)
    return `no server with ${taskTotalVram(t)} GB free VRAM`;
  if ((t.min_ram_gb ?? 0) > rem.ram_gb)
    return `no server with ${t.min_ram_gb} GB RAM`;
  if ((t.min_disk_gb ?? 0) > rem.disk_gb)
    return `no server with ${t.min_disk_gb} GB disk`;
  if ((t.min_cpu_cores ?? 0) > rem.cpu_cores)
    return `no server with ${t.min_cpu_cores} CPU cores`;
  return "no fit";
}
__name(reasonFor, "reasonFor");
function deduct(rem, t) {
  rem.gpu_count -= taskGpuCount(t);
  rem.gpu_mem_gb -= taskTotalVram(t);
  rem.ram_gb -= t.min_ram_gb ?? 0;
  rem.disk_gb -= t.min_disk_gb ?? 0;
  rem.cpu_cores -= t.min_cpu_cores ?? 0;
}
__name(deduct, "deduct");
function capacityScore(c) {
  return c.gpu_count * 1e3 + c.gpu_mem_gb + c.ram_gb * 0.01;
}
__name(capacityScore, "capacityScore");
function allocateTasks(tasks, servers) {
  const ordered = [...tasks].sort((a, b) => {
    const da = taskGpuCount(a) * 1e5 + taskTotalVram(a);
    const db = taskGpuCount(b) * 1e5 + taskTotalVram(b);
    return db - da;
  });
  const rem = {};
  for (const s of servers)
    rem[s.server_id] = { ...s };
  const recommended_allocation = [];
  const unassignable = [];
  const candidates_per_task = {};
  for (const t of ordered) {
    const ranked = servers.map((s) => ({ s, r: rem[s.server_id] })).filter(({ r }) => canFit(r, t)).sort((a, b) => capacityScore(b.r) - capacityScore(a.r));
    candidates_per_task[t.id] = ranked.map(({ s, r }) => ({
      server_id: s.server_id,
      name: s.name,
      why_ranked: `free ${r.gpu_count} GPU, ${Math.floor(r.gpu_mem_gb)} GB VRAM, ${r.ram_gb} GB RAM${s.stale ? " (static spec, load stale)" : ""}`
    }));
    const first = ranked[0];
    if (!first) {
      const probe = servers[0];
      unassignable.push({ task_id: t.id, reason: probe ? reasonFor(rem[probe.server_id], t) : "no servers" });
      continue;
    }
    deduct(first.r, t);
    recommended_allocation.push({ task_id: t.id, server_id: first.s.server_id, server_name: first.s.name });
  }
  return { recommended_allocation, unassignable, candidates_per_task };
}
__name(allocateTasks, "allocateTasks");

// src/mcp/tools/plan_task_allocation.ts
var planTaskAllocationTool = {
  definition: {
    name: "plan_task_allocation",
    description: "\u628A\u591A\u4E2A\u4EFB\u52A1\u6309\u591A\u7EF4\u7EA6\u675F(GPU\u6570/\u663E\u5B58/\u5185\u5B58/\u78C1\u76D8/CPU)\u88C5\u7BB1\u5206\u914D\u5230\u5F53\u524D\u7A7A\u95F2\u7684\u670D\u52A1\u5668,\u8FD4\u56DE\u63A8\u8350\u5206\u914D\u8868+\u6392\u5E8F\u5019\u9009+\u65E0\u6CD5\u5206\u914D\u9879\u3002\u8D1F\u8F7D\u6570\u636E\u4F18\u5148\u7528\u5B9E\u65F6\u5FEB\u7167,\u7F3A\u5931\u56DE\u9000\u9759\u6001\u89C4\u683C\u5E76\u6807\u8BB0stale\u30028\u4E2A\u8BAD\u7EC3\u4EFB\u52A1\u6392\u961F\u591A\u673A\u5206\u5E03\u65F6\u7528\u6B64\u5DE5\u5177\u3002",
    inputSchema: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          description: "\u4EFB\u52A1\u5217\u8868,\u6BCF\u4E2A\u542Bid\u548C\u53EF\u9009\u7EA6\u675F\u3002",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              gpu_count: { type: "number" },
              min_gpu_memory_gb: { type: "number" },
              min_ram_gb: { type: "number" },
              min_disk_gb: { type: "number" },
              min_cpu_cores: { type: "number" }
            },
            required: ["id"]
          }
        },
        exclude_stale_load_sec: { type: "number", description: "\u8D1F\u8F7D\u6570\u636E\u8D85\u8FC7N\u79D2\u89C6\u4E3A\u9648\u65E7(\u4EC5\u544A\u8B66,\u4E0D\u963B\u65AD)\u3002\u9ED8\u8BA4300\u3002" }
      },
      required: ["tasks"]
    }
  },
  execute: async (args, { db }) => {
    const tasks = args.tasks ?? [];
    const staleLimit = args.exclude_stale_load_sec ?? 300;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const dbServers = await queryServersByAbility(db, { status_online: true });
    const capacities = dbServers.map((s) => resolveCapacity(s, now));
    const result = allocateTasks(tasks, capacities);
    const stale_warnings = dbServers.map((s) => ({ server_id: s.id, load_age_sec: loadAgeSec(s, now) })).filter((x) => x.load_age_sec === null || x.load_age_sec > staleLimit);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ...result,
          stale_warnings,
          how_to: "\u7167 recommended_allocation \u6267\u884C;\u8981\u6362\u673A\u7528 candidates_per_task;\u8D1F\u8F7D\u9648\u65E7\u5148 refresh_load \u518D\u91CD\u7B97\u3002"
        })
      }]
    };
  }
};

// src/orchestration/disk.ts
function isNetworkReachable(a, b, reachableProxyIdsByServerId) {
  const aDirect = a.direct_when_no_proxy === 1 || a.v2ray_available === 1 && a.direct_when_proxy_available === 1;
  const bDirect = b.direct_when_no_proxy === 1 || b.v2ray_available === 1 && b.direct_when_proxy_available === 1;
  if (aDirect && bDirect)
    return true;
  const ap = reachableProxyIdsByServerId[a.id] ?? /* @__PURE__ */ new Set();
  const bp = reachableProxyIdsByServerId[b.id] ?? /* @__PURE__ */ new Set();
  for (const p of ap)
    if (bp.has(p))
      return true;
  return false;
}
__name(isNetworkReachable, "isNetworkReachable");
function selectDiskProvider(needy, needGb, candidates, reachableProxyIdsByServerId, now) {
  const viable = candidates.filter((s) => s.id !== needy.id).filter((s) => isNetworkReachable(needy, s, reachableProxyIdsByServerId)).map((s) => ({ server: s, cap: resolveCapacity(s, now) })).filter((x) => x.cap.disk_gb >= needGb).sort((a, b) => b.cap.disk_gb - a.cap.disk_gb);
  const top = viable[0];
  return top ? { server: top.server, disk_free_gb: top.cap.disk_gb } : null;
}
__name(selectDiskProvider, "selectDiskProvider");
function buildSshfsCommands(provider, needy) {
  const keyB64 = provider.key_content ? btoa(provider.key_content) : "";
  return {
    prep_key_cmd: `echo '${keyB64}' | base64 -d > /tmp/dsh_${provider.id} && chmod 600 /tmp/dsh_${provider.id}`,
    mount_cmd: `sshfs ${provider.username}@${provider.host}:/data /mnt/remote -p ${provider.port} -o IdentityFile=/tmp/dsh_${provider.id}`,
    umount_cmd: "fusermount -u /mnt/remote"
  };
}
__name(buildSshfsCommands, "buildSshfsCommands");
function buildNfsCommands(provider, needy) {
  return {
    provider_export_cmd: `echo '/data ${needy.host}(rw,sync,no_subtree_check)' >> /etc/exports && exportfs -ra`,
    needy_mount_cmd: `mount -t nfs ${provider.host}:/data /mnt/remote`
  };
}
__name(buildNfsCommands, "buildNfsCommands");

// src/mcp/tools/plan_disk_share.ts
var planDiskShareTool = {
  definition: {
    name: "plan_disk_share",
    description: "\u5F53\u4E00\u53F0\u673A\u5668\u786C\u76D8\u4E0D\u8DB3\u65F6,\u9009\u51FA\u53E6\u4E00\u53F0\u786C\u76D8\u5BCC\u4F59\u4E14\u7F51\u7EDC\u53EF\u8FBE\u7684\u673A\u5668\u4F5C\u4F9B\u5E94\u673A,\u8FD4\u56DEsshfs(\u9ED8\u8BA4)\u6216nfs\u6302\u8F7D\u547D\u4EE4(\u7528get_servers\u7684base64\u5BC6\u94A5\u62FC\u5168)\u3002mode: sshfs|nfs|both\u3002",
    inputSchema: {
      type: "object",
      properties: {
        needy_server_id: { type: "string", description: "\u7F3A\u76D8\u673AID(\u6765\u81EAget_servers)\u3002" },
        need_gb: { type: "number", description: "\u9700\u8981\u7684\u78C1\u76D8GB\u3002" },
        mode: { type: "string", enum: ["sshfs", "nfs", "both"], default: "sshfs" }
      },
      required: ["needy_server_id", "need_gb"]
    }
  },
  execute: async (args, { db }) => {
    const needyId = args.needy_server_id;
    const needGb = args.need_gb;
    const mode = args.mode ?? "sshfs";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const all = await queryServersByAbility(db, { status_online: true });
    const needy = all.find((s) => s.id === needyId);
    if (!needy) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "needy server not found" }) }], isError: true };
    }
    const candidates = all.filter((s) => s.id !== needyId);
    const reachMap = {};
    for (const s of all) {
      const r = await getReachability(db, s.id);
      reachMap[s.id] = new Set(r.filter((x) => x.reachable === 1).map((x) => x.proxy_id));
    }
    const provider = selectDiskProvider(needy, needGb, candidates, reachMap, now);
    if (!provider) {
      return { content: [{ type: "text", text: JSON.stringify({ needy_server: { id: needy.id, name: needy.name }, error: "no reachable server with enough free disk", need_gb: needGb }) }], isError: true };
    }
    const out = {
      provider_server: { id: provider.server.id, name: provider.server.name, disk_free_gb: provider.disk_free_gb },
      needy_server: { id: needy.id, name: needy.name }
    };
    out.sshfs = buildSshfsCommands(provider.server, needy);
    if (mode === "nfs" || mode === "both")
      out.nfs = buildNfsCommands(provider.server, needy);
    out.how_to = "\u5728\u7F3A\u76D8\u673A\u6267\u884C sshfs.prep_key_cmd + sshfs.mount_cmd \u5373\u53EF\u50CF\u672C\u5730\u76EE\u5F55\u7528\u4F9B\u5E94\u673A\u78C1\u76D8;\u957F\u671F\u5171\u4EAB\u7528 nfs;\u7528\u5B8C sshfs.umount_cmd \u5378\u8F7D\u3002";
    return { content: [{ type: "text", text: JSON.stringify(out) }] };
  }
};

// src/orchestration/network.ts
function proxyUrl(p) {
  return `${p.protocol}://${p.host}:${p.port}`;
}
__name(proxyUrl, "proxyUrl");
function buildProxyAcceleration(proxy, resourceUrl) {
  const u = proxyUrl(proxy);
  return {
    proxy,
    commands: {
      env: `export http_proxy=${u} https_proxy=${u}`,
      proxychains: `proxychains4 wget ${resourceUrl}`,
      git: `git config --global http.proxy ${u}`,
      wget: `wget -e use_proxy=yes -e https_proxy=${u} ${resourceUrl}`,
      pip: `pip install --proxy ${u} <pkg>`
    }
  };
}
__name(buildProxyAcceleration, "buildProxyAcceleration");
function buildJumpRelay(jump, target, resourceUrl) {
  return {
    jump_server: { id: jump.id, name: jump.name, host: jump.host, port: jump.port, username: jump.username },
    steps: [
      `\u5728\u8DF3\u677F\u673A ${jump.host}: wget ${resourceUrl} -O /tmp/payload`,
      `\u4ECE\u8DF3\u677F\u673A\u4F20\u5230\u76EE\u6807\u673A: scp -3 /tmp/payload ${target.username}@${target.host}:/data/  (\u6216\u7ECF\u4EE3\u7406\u7684 rsync)`
    ]
  };
}
__name(buildJumpRelay, "buildJumpRelay");
function planRelay(target, resourceUrl, reachableProxies, jumpCandidates) {
  const result = {
    how_to: "\u4F18\u5148\u7528 proxy_acceleration \u8BA9\u76EE\u6807\u673A\u81EA\u5DF1\u52A0\u901F;\u76EE\u6807\u673A\u5B8C\u5168\u4E0D\u901A\u65F6\u7528 jump_relay \u4E2D\u8F6C\u3002"
  };
  if (reachableProxies.length > 0) {
    const best = [...reachableProxies].sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity))[0];
    result.proxy_acceleration = buildProxyAcceleration(best, resourceUrl);
  }
  const jump = jumpCandidates.find(
    (s) => s.id !== target.id && s.status_online === 1 && (s.direct_when_no_proxy === 1 || s.v2ray_available === 1 && s.direct_when_proxy_available === 1)
  );
  if (jump)
    result.jump_relay = buildJumpRelay(jump, target, resourceUrl);
  if (!result.proxy_acceleration && !result.jump_relay) {
    return {
      how_to: "\u65E0\u53EF\u8FBE\u4EE3\u7406\u4E5F\u65E0\u7F51\u7EDC\u901A\u7545\u7684\u8DF3\u677F\u673A;\u5EFA\u8BAE\u5148 verify_server_connectivity \u8BCA\u65AD\u6216 add_proxy \u589E\u52A0\u4EE3\u7406\u8282\u70B9\u3002"
    };
  }
  return result;
}
__name(planRelay, "planRelay");

// src/mcp/tools/plan_network_relay.ts
var planNetworkRelayTool = {
  definition: {
    name: "plan_network_relay",
    description: "\u7ED9\u4E00\u53F0\u7F51\u7EDC\u6162/\u4E0D\u901A\u7684\u670D\u52A1\u5668\u62FF\u5230\u8D44\u6E90\u7684\u6700\u4F73\u65B9\u6848:\u6709\u53EF\u8FBE\u4EE3\u7406\u2192\u8FD4\u56DE\u4EE3\u7406\u52A0\u901F\u547D\u4EE4(http_proxy/proxychains/git/wget/pip\u5168\u5F62\u6001);\u5B8C\u5168\u4E0D\u901A\u4F46\u6709\u901A\u7545\u673A\u5668\u2192\u8FD4\u56DE\u8DF3\u677F\u4E2D\u8F6C\u547D\u4EE4;\u4E24\u8005\u90FD\u53EF\u884C\u90FD\u8FD4\u56DE\u3002",
    inputSchema: {
      type: "object",
      properties: {
        target_server_id: { type: "string", description: "\u76EE\u6807\u673AID(\u6765\u81EAget_servers)\u3002" },
        resource_url: { type: "string", description: "\u8981\u4E0B\u8F7D\u7684\u8D44\u6E90URL\u3002" }
      },
      required: ["target_server_id", "resource_url"]
    }
  },
  execute: async (args, { db }) => {
    const targetId = args.target_server_id;
    const resourceUrl = args.resource_url;
    const all = await queryServersByAbility(db, { status_online: true });
    const target = all.find((s) => s.id === targetId);
    if (!target) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "target server not found" }) }], isError: true };
    }
    const reachRows = await getReachability(db, target.id);
    const proxies = await listProxies(db);
    const proxyById = new Map(proxies.map((p) => [p.id, p]));
    const reachableProxies = reachRows.filter((r) => r.reachable === 1).map((r) => {
      const p = proxyById.get(r.proxy_id);
      return { id: r.proxy_id, name: r.proxy_name, host: p?.host ?? "", port: p?.port ?? 0, protocol: p?.protocol ?? "socks5", latency_ms: r.latency_ms };
    });
    const result = planRelay(target, resourceUrl, reachableProxies, all);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
};

// src/mcp/tools/index.ts
var toolRegistry = [
  // The one-shot "get servers + how to connect" tool — the primary entry point
  getServersTool,
  // Server management
  upsertServerTool,
  updateServerTool,
  removeServerTool,
  verifyConnectivityTool,
  // Proxy management
  listProxiesTool,
  addProxyTool,
  removeProxyTool,
  // Multi-server orchestration
  refreshLoadTool,
  planTaskAllocationTool,
  planDiskShareTool,
  planNetworkRelayTool
];
function getTool(name) {
  return toolRegistry.find((t) => t.definition.name === name);
}
__name(getTool, "getTool");
async function executeTool(name, args, ctx) {
  const tool = getTool(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true
    };
  }
  return tool.execute(args, ctx);
}
__name(executeTool, "executeTool");

// src/mcp/handler.ts
async function handleMcpRequest(request, ctx) {
  if (!request || request.jsonrpc !== "2.0") {
    return makeError(request?.id, MCP_ERROR_CODES.INVALID_REQUEST, "Must use JSON-RPC 2.0");
  }
  try {
    switch (request.method) {
      case "initialize":
        return handleInitialize(request);
      case "tools/list":
        return handleListTools(request);
      case "tools/call":
        return await handleCallTool(request, ctx);
      default:
        return makeError(request.id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown method: ${request.method}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeError(request.id, MCP_ERROR_CODES.INTERNAL_ERROR, msg);
  }
}
__name(handleMcpRequest, "handleMcpRequest");
function handleInitialize(request) {
  const params = request.params;
  const requestedVersion = params?.protocolVersion;
  const supported = requestedVersion === "2024-11-05" || requestedVersion === "2025-03-26";
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      protocolVersion: supported ? requestedVersion : "2025-03-26",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "dsh-mcp-server",
        version: "0.1.0"
      }
    }
  };
}
__name(handleInitialize, "handleInitialize");
function handleListTools(request) {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      tools: toolRegistry.map((t) => ({
        name: t.definition.name,
        description: t.definition.description,
        inputSchema: t.definition.inputSchema
      }))
    }
  };
}
__name(handleListTools, "handleListTools");
async function handleCallTool(request, ctx) {
  const params = request.params;
  if (!params || !params.name) {
    return makeError(request.id, MCP_ERROR_CODES.INVALID_PARAMS, "Missing tool name");
  }
  const result = await executeTool(params.name, params.arguments ?? {}, ctx);
  return {
    jsonrpc: "2.0",
    id: request.id,
    result
  };
}
__name(handleCallTool, "handleCallTool");
function makeError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id: id ?? 0,
    error: { code, message }
  };
}
__name(makeError, "makeError");

// node_modules/hono/dist/utils/stream.js
var StreamingApi = /* @__PURE__ */ __name(class {
  writer;
  encoder;
  writable;
  abortSubscribers = [];
  responseReadable;
  /**
   * Whether the stream has been aborted.
   */
  aborted = false;
  /**
   * Whether the stream has been closed normally.
   */
  closed = false;
  constructor(writable, _readable) {
    this.writable = writable;
    this.writer = writable.getWriter();
    this.encoder = new TextEncoder();
    const reader = _readable.getReader();
    this.abortSubscribers.push(async () => {
      await reader.cancel();
    });
    this.responseReadable = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        done ? controller.close() : controller.enqueue(value);
      },
      cancel: () => {
        if (!this.closed) {
          this.abort();
        }
      }
    });
  }
  async write(input) {
    try {
      if (typeof input === "string") {
        input = this.encoder.encode(input);
      }
      await this.writer.write(input);
    } catch {
    }
    return this;
  }
  async writeln(input) {
    await this.write(input + "\n");
    return this;
  }
  sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  async close() {
    this.closed = true;
    try {
      await this.writer.close();
    } catch {
    }
  }
  async pipe(body) {
    this.writer.releaseLock();
    try {
      await body.pipeTo(this.writable, { preventClose: true, preventAbort: true });
    } finally {
      this.writer = this.writable.getWriter();
    }
  }
  onAbort(listener) {
    this.abortSubscribers.push(listener);
  }
  /**
   * Abort the stream.
   * You can call this method when stream is aborted by external event.
   */
  abort() {
    if (!this.aborted) {
      this.aborted = true;
      this.abortSubscribers.forEach((subscriber) => subscriber());
    }
  }
}, "StreamingApi");

// node_modules/hono/dist/helper/streaming/utils.js
var isOldBunVersion = /* @__PURE__ */ __name(() => {
  const version = typeof Bun !== "undefined" ? Bun.version : void 0;
  if (version === void 0) {
    return false;
  }
  const result = version.startsWith("1.1") || version.startsWith("1.0") || version.startsWith("0.");
  isOldBunVersion = /* @__PURE__ */ __name(() => result, "isOldBunVersion");
  return result;
}, "isOldBunVersion");

// node_modules/hono/dist/helper/streaming/sse.js
var SSEStreamingApi = /* @__PURE__ */ __name(class extends StreamingApi {
  constructor(writable, readable) {
    super(writable, readable);
  }
  async writeSSE(message) {
    const data = await resolveCallback(message.data, HtmlEscapedCallbackPhase.Stringify, false, {});
    const dataLines = data.split(/\r\n|\r|\n/).map((line) => {
      return `data: ${line}`;
    }).join("\n");
    for (const key of ["event", "id"]) {
      const value = message[key];
      if (value && /[\r\n]/.test(value)) {
        throw new Error(`${key} must not contain "\\r" or "\\n"`);
      }
    }
    const sseData = [
      message.event && `event: ${message.event}`,
      dataLines,
      message.id !== void 0 && `id: ${message.id}`,
      message.retry !== void 0 && `retry: ${message.retry}`
    ].filter(Boolean).join("\n") + "\n\n";
    await this.write(sseData);
  }
}, "SSEStreamingApi");
var run = /* @__PURE__ */ __name(async (stream2, cb, onError) => {
  try {
    await cb(stream2);
  } catch (e) {
    if (e instanceof Error && onError) {
      await onError(e, stream2);
      await stream2.writeSSE({
        event: "error",
        data: e.message
      });
    } else {
      console.error(e);
    }
  } finally {
    stream2.close();
  }
}, "run");
var contextStash = /* @__PURE__ */ new WeakMap();
var streamSSE = /* @__PURE__ */ __name((c, cb, onError) => {
  const { readable, writable } = new TransformStream();
  const stream2 = new SSEStreamingApi(writable, readable);
  if (isOldBunVersion()) {
    c.req.raw.signal.addEventListener("abort", () => {
      if (!stream2.closed) {
        stream2.abort();
      }
    });
  }
  contextStash.set(stream2.responseReadable, c);
  c.header("Transfer-Encoding", "chunked");
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  run(stream2, cb, onError);
  return c.newResponse(stream2.responseReadable);
}, "streamSSE");

// src/mcp/transport.ts
var sessions = /* @__PURE__ */ new Map();
function createSession() {
  const id = crypto.randomUUID();
  const session = { id, stream: null, responseQueue: [], resolver: null };
  sessions.set(id, session);
  return session;
}
__name(createSession, "createSession");
function getSession(id) {
  return sessions.get(id);
}
__name(getSession, "getSession");
function removeSession(id) {
  sessions.delete(id);
}
__name(removeSession, "removeSession");
async function handleSseConnection(c, sessionId) {
  const session = getSession(sessionId);
  if (!session) {
    return c.text("Session not found", 404);
  }
  return streamSSE(c, async (stream2) => {
    session.stream = stream2;
    await stream2.writeSSE({
      event: "endpoint",
      data: `/mcp?session=${sessionId}`
    });
    try {
      while (true) {
        if (stream2.aborted)
          break;
        while (session.responseQueue.length > 0) {
          if (stream2.aborted)
            break;
          const msg = session.responseQueue.shift();
          await stream2.writeSSE({
            event: "message",
            data: JSON.stringify(msg)
          });
        }
        if (stream2.aborted)
          break;
        if (session.responseQueue.length === 0) {
          const response = await new Promise((resolve) => {
            queueMicrotask(() => {
              if (session.responseQueue.length > 0) {
                resolve(session.responseQueue.shift());
              } else {
                session.resolver = resolve;
              }
            });
          });
          await stream2.writeSSE({
            event: "message",
            data: JSON.stringify(response)
          });
        }
      }
    } catch (_err) {
    } finally {
      removeSession(sessionId);
    }
  });
}
__name(handleSseConnection, "handleSseConnection");
function sendResponse(sessionId, response) {
  const session = getSession(sessionId);
  if (!session)
    return;
  if (session.resolver) {
    const resolve = session.resolver;
    session.resolver = null;
    resolve(response);
  } else {
    session.responseQueue.push(response);
  }
}
__name(sendResponse, "sendResponse");

// src/api/servers.ts
var app = new Hono2();
app.get("/", async (c) => {
  const tag = c.req.query("tag");
  const servers = await listServers(c.env.DB, tag);
  return c.json(servers);
});
app.get("/query", async (c) => {
  const filters = {
    gpu_model: c.req.query("gpu_model"),
    min_ram_gb: c.req.query("min_ram_gb") ? Number(c.req.query("min_ram_gb")) : void 0,
    min_cpu_cores: c.req.query("min_cpu_cores") ? Number(c.req.query("min_cpu_cores")) : void 0,
    min_disk_gb: c.req.query("min_disk_gb") ? Number(c.req.query("min_disk_gb")) : void 0,
    status_online: c.req.query("status_online") === "true" ? true : c.req.query("status_online") === "false" ? false : void 0
  };
  const servers = await queryServersByAbility(c.env.DB, filters);
  return c.json(servers);
});
app.get("/:id", async (c) => {
  const server = await getServerById(c.env.DB, c.req.param("id"));
  if (!server)
    return c.json({ error: "Not found" }, 404);
  const reachable = await getReachability(c.env.DB, server.id);
  const detail = dbServerToDetail(server, reachable.map((r) => ({ id: r.proxy_id, name: r.proxy_name, latency_ms: r.latency_ms })));
  return c.json(detail);
});
app.post("/", async (c) => {
  const body = await c.req.json();
  const id = await createServer(c.env.DB, {
    name: body.name,
    vendor_url: body.vendor_url ?? null,
    host: body.host,
    port: body.port ?? 22,
    username: body.username,
    auth_method: body.auth_method,
    key_path: body.key_path ?? null,
    key_content: body.key_content ?? null,
    password: body.password ?? null,
    v2ray_available: body.v2ray_available ? 1 : 0,
    direct_when_proxy_available: body.direct_when_proxy_available ? 1 : 0,
    direct_when_no_proxy: body.direct_when_no_proxy ? 1 : 0,
    gpu_model: body.gpu_model ?? null,
    gpu_memory_gb: body.gpu_memory_gb ?? null,
    gpu_count: body.gpu_count ?? null,
    cpu_cores: body.cpu_cores ?? null,
    ram_gb: body.ram_gb ?? null,
    disk_gb: body.disk_gb ?? null,
    default_proxy_id: body.default_proxy_id ?? null,
    notes: body.notes ?? null,
    tags: body.tags ? JSON.stringify(body.tags) : null
  });
  return c.json({ id }, 201);
});
app.put("/:id", async (c) => {
  const body = await c.req.json();
  const success = await updateServer(c.env.DB, c.req.param("id"), body);
  return c.json({ success });
});
app.delete("/:id", async (c) => {
  const success = await deleteServer(c.env.DB, c.req.param("id"));
  return c.json({ success });
});
app.post("/:id/claim", async (c) => {
  const body = await c.req.json();
  const server = await getServerById(c.env.DB, c.req.param("id"));
  if (!server)
    return c.json({ error: "Not found" }, 404);
  await updateServerTask(c.env.DB, server.id, {
    agent: body.agent || "unknown",
    task: body.task || "unspecified"
  });
  return c.json({
    success: true,
    server_id: server.id,
    server_name: server.name,
    claimed_by: body.agent,
    task: body.task
  });
});
app.post("/:id/release", async (c) => {
  const server = await getServerById(c.env.DB, c.req.param("id"));
  if (!server)
    return c.json({ error: "Not found" }, 404);
  await releaseServerTask(c.env.DB, server.id);
  return c.json({
    success: true,
    server_id: server.id,
    server_name: server.name
  });
});
app.post("/probe/:id", async (c) => {
  const server = await getServerById(c.env.DB, c.req.param("id"));
  if (!server)
    return c.json({ error: "Not found" }, 404);
  const pingResult = await tcpPing(server.host, server.port);
  await updateServerStatus(c.env.DB, server.id, {
    online: pingResult.reachable,
    ping_ms: pingResult.latency_ms,
    error: pingResult.error
  });
  let bannerResult = {};
  if (pingResult.reachable) {
    bannerResult = await grabSSHBanner(server.host, server.port);
    if (bannerResult.banner) {
      await updateServer(c.env.DB, server.id, {
        ssh_banner: bannerResult.banner,
        os_hint: bannerResult.os_hint || null
      });
    }
  }
  return c.json({
    success: true,
    ...pingResult,
    ssh: bannerResult.banner ? {
      banner: bannerResult.banner,
      ssh_version: bannerResult.ssh_version,
      os_hint: bannerResult.os_hint
    } : null
  });
});
app.post("/:id/enable", async (c) => {
  const server = await getServerById(c.env.DB, c.req.param("id"));
  if (!server)
    return c.json({ error: "Not found" }, 404);
  await setServerEnabled(c.env.DB, server.id, true);
  return c.json({ success: true, enabled: true, server_id: server.id });
});
app.post("/:id/disable", async (c) => {
  const server = await getServerById(c.env.DB, c.req.param("id"));
  if (!server)
    return c.json({ error: "Not found" }, 404);
  await setServerEnabled(c.env.DB, server.id, false);
  return c.json({ success: true, enabled: false, server_id: server.id });
});
var servers_default = app;

// src/api/proxies.ts
var app2 = new Hono2();
app2.get("/", async (c) => {
  const proxies = await listProxies(c.env.DB);
  return c.json(proxies);
});
app2.get("/:id", async (c) => {
  const proxy = await getProxyById(c.env.DB, c.req.param("id"));
  if (!proxy)
    return c.json({ error: "Not found" }, 404);
  return c.json(proxy);
});
app2.post("/", async (c) => {
  const body = await c.req.json();
  const id = await createProxy(c.env.DB, {
    name: body.name,
    host: body.host,
    port: body.port ?? 1080,
    username: body.username ?? null,
    password: body.password ?? null,
    location: body.location ?? null,
    protocol: body.protocol ?? "socks5"
  });
  return c.json({ id }, 201);
});
app2.put("/:id", async (c) => {
  const body = await c.req.json();
  const success = await updateProxy(c.env.DB, c.req.param("id"), body);
  return c.json({ success });
});
app2.delete("/:id", async (c) => {
  const success = await deleteProxy(c.env.DB, c.req.param("id"));
  return c.json({ success });
});
var proxies_default = app2;

// src/api/verify.ts
var app3 = new Hono2();
app3.post("/", async (c) => {
  const body = await c.req.json();
  const { host, port = 22, server_id } = body;
  return streamSSE(c, async (stream2) => {
    await stream2.writeSSE({ event: "verify", data: JSON.stringify({ step: "direct_ssh", status: "running" }) });
    const pingResult = await tcpPing(host, port);
    await stream2.writeSSE({ event: "verify", data: JSON.stringify({
      step: "direct_ssh",
      status: pingResult.reachable ? "success" : "failed",
      latency_ms: pingResult.latency_ms,
      error: pingResult.error
    }) });
    const proxies = await listProxies(c.env.DB);
    const proxyResults = [];
    for (const proxy of proxies) {
      await stream2.writeSSE({ event: "verify", data: JSON.stringify({
        step: "proxy_ssh",
        proxy_id: proxy.id,
        proxy_name: proxy.name,
        status: "running"
      }) });
      let result;
      if (proxy.protocol === "socks5") {
        result = await testViaSocks5(
          proxy.host,
          proxy.port,
          host,
          port,
          proxy.username ?? void 0,
          proxy.password ?? void 0
        );
      } else {
        result = await tcpPing(host, port);
      }
      proxyResults.push({ proxy_id: proxy.id, name: proxy.name, ...result });
      await stream2.writeSSE({ event: "verify", data: JSON.stringify({
        step: "proxy_ssh",
        proxy_id: proxy.id,
        proxy_name: proxy.name,
        status: result.reachable ? "success" : "failed",
        latency_ms: result.latency_ms,
        error: result.error
      }) });
      if (result.reachable && server_id) {
        await upsertReachability(c.env.DB, proxy.id, server_id, true, result.latency_ms);
      }
    }
    const bestProxy = proxyResults.filter((r) => r.reachable).sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity))[0];
    await stream2.writeSSE({ event: "verify", data: JSON.stringify({
      step: "complete",
      best_proxy: bestProxy ? { id: bestProxy.proxy_id, name: bestProxy.name, latency_ms: bestProxy.latency_ms } : null
    }) });
  });
});
var verify_default = app3;

// src/api/usage.ts
var app4 = new Hono2();
app4.get("/", async (c) => {
  const logs = await getUsageLogs(
    c.env.DB,
    c.req.query("server_id"),
    c.req.query("agent_id"),
    c.req.query("limit") ? Number(c.req.query("limit")) : 50
  );
  return c.json(logs);
});
app4.post("/", async (c) => {
  const body = await c.req.json();
  const id = await recordUsage(c.env.DB, {
    server_id: body.server_id,
    agent_id: body.agent_id,
    session_id: body.session_id,
    action: body.action,
    details: body.details ? JSON.stringify(body.details) : void 0
  });
  return c.json({ id }, 201);
});
var usage_default = app4;

// src/api/ai.ts
var app5 = new Hono2();
app5.post("/extract-server", async (c) => {
  const apiUrl = c.env.AI_MODEL_API_URL;
  const apiKey = c.env.AI_MODEL_API_KEY;
  const modelName = c.env.AI_MODEL_NAME || "gpt-4o";
  if (!apiUrl || !apiKey) {
    return c.json({ error: "AI model not configured. Set AI_MODEL_API_URL and AI_MODEL_API_KEY in Worker env." }, 400);
  }
  const body = await c.req.json();
  const { text, images } = body;
  if (!text && (!images || images.length === 0)) {
    return c.json({ error: "No content provided. Send text and/or images." }, 400);
  }
  const userContent = [
    {
      type: "text",
      text: `Extract server connection information from the following content. Return ONLY valid JSON with these fields:
{
  "name": "server name/hostname",
  "host": "SSH connection address \u2014 use public IP if available, otherwise internal IP",
  "port": 22,
  "username": "SSH login username (NOT the web console username, find the actual SSH user)",
  "ssh_username": "same as 'username' \u2014 the SSH login user",
  "internal_ip": "private/internal IP address (10.x.x.x, 172.x.x.x, 192.168.x.x, or cloud private IP)",
  "external_ip": "public/external IP address if visible",
  "auth_method": "key or password",
  "key_content": "full private key content if provided (ensure proper line breaks)",
  "password": "password if auth_method is password",
  "gpu_model": "GPU model if visible",
  "gpu_memory_gb": number,
  "cpu_cores": number,
  "ram_gb": number,
  "disk_gb": number,
  "vendor_url": "cloud provider URL if visible",
  "tags": ["any", "relevant", "tags"],
  "notes": "any other useful information"
}

Rules:
- CRITICAL: Distinguish SSH username from web console username. The SSH user is what you use with "ssh user@host", NOT the cloud console login.
- CRITICAL: Distinguish internal/private IP from external/public IP. Set "host" to the public IP if visible, otherwise internal IP.
- If you see an SSH private key (-----BEGIN...), set auth_method to "key" and put the FULL key in key_content. Preserve the exact format with proper line breaks.
- If you see a password, set auth_method to "password" and put it in the password field.
- For images, read all visible text including IPs, credentials, GPU info, etc.
- If exact values aren't visible, make reasonable inferences and note them.
- Always include port (default 22 if not specified).
- Return JSON ONLY, no other text.`
    }
  ];
  if (text) {
    userContent.push({
      type: "text",
      text: `Here is the text content to extract from:

${text}`
    });
  }
  if (images && Array.isArray(images)) {
    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mime_type || "image/png"};base64,${img.base64}`
        }
      });
    }
  }
  try {
    const baseUrl = apiUrl.replace(/\/$/, "");
    const apiPath = baseUrl.includes("/v1/") ? "/chat/completions" : "/v1/chat/completions";
    const fullUrl = baseUrl + apiPath;
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "dsh-mcp-server/1.0"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You are a server information extraction assistant. Extract structured server connection details from user-provided text or images. Return ONLY valid JSON."
          },
          {
            role: "user",
            content: userContent
          }
        ],
        temperature: 0.1,
        max_tokens: 2e3
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({
        error: `AI model API error (${response.status}) calling ${fullUrl}. Response: ${errorText || "(empty)"}`
      }, 502);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return c.json({ error: "AI model returned empty response" }, 502);
    }
    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        return c.json({ error: `Failed to parse AI response as JSON: ${content.substring(0, 200)}` }, 502);
      }
    }
    if (extracted.key_content) {
      extracted.key_content = formatSshKey(extracted.key_content);
    }
    if (!extracted.port) {
      extracted.port = 22;
    }
    return c.json({ success: true, data: extracted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `AI model call failed: ${msg}` }, 502);
  }
});
function formatSshKey(key) {
  let cleaned = key.trim();
  if (cleaned.includes("-----BEGIN") && cleaned.includes("\n")) {
    cleaned = cleaned.replace(/\r\n/g, "\n");
    return cleaned;
  }
  const beginMatch = cleaned.match(/-----BEGIN\s*(RSA|EC|DSA|OPENSSH|PRIVATE)\s*KEY-----/i);
  const endMatch = cleaned.match(/-----END\s*(RSA|EC|DSA|OPENSSH|PRIVATE)\s*KEY-----/i);
  if (beginMatch && endMatch) {
    const beginHeader = beginMatch[0];
    const endFooter = endMatch[0];
    const startIdx = cleaned.indexOf(beginHeader) + beginHeader.length;
    const endIdx = cleaned.indexOf(endFooter);
    let body = cleaned.substring(startIdx, endIdx).trim();
    body = body.replace(/[^A-Za-z0-9+/=]/g, "");
    const wrapped = body.match(/.{1,64}/g)?.join("\n") || body;
    return `${beginHeader}
${wrapped}
${endFooter}
`;
  }
  return cleaned;
}
__name(formatSshKey, "formatSshKey");
app5.post("/extract-proxy", async (c) => {
  const apiUrl = c.env.AI_MODEL_API_URL;
  const apiKey = c.env.AI_MODEL_API_KEY;
  const modelName = c.env.AI_MODEL_NAME || "gpt-4o";
  if (!apiUrl || !apiKey) {
    return c.json({ error: "AI model not configured." }, 400);
  }
  const body = await c.req.json();
  const { text, images } = body;
  if (!text && (!images || images.length === 0)) {
    return c.json({ error: "No content provided." }, 400);
  }
  const systemMsg = "You are a proxy node information extraction assistant. Extract structured SOCKS5/HTTP proxy connection details from user-provided text or images. Return ONLY valid JSON.";
  const userMsg = `Extract proxy/VPN node information from the following content. Return ONLY valid JSON with these fields:
{
  "name": "proxy node name/hostname",
  "host": "proxy server IP or domain",
  "port": 1080,
  "username": "proxy auth username (if any)",
  "password": "proxy auth password (if any)",
  "location": "geographic location like Hong Kong, Japan, US West",
  "protocol": "socks5 or http"
}

Rules:
- Default port is 1080 for SOCKS5, 3128 for HTTP
- If you see subscription info or proxy config text, extract all visible nodes
- If multiple proxies are visible, return the first/primary one
- Return JSON ONLY, no other text.`;
  const userContent = [{ type: "text", text: userMsg }];
  if (text)
    userContent.push({ type: "text", text: `Content to extract from:

${text}` });
  if (images && Array.isArray(images)) {
    for (const img of images) {
      userContent.push({ type: "image_url", image_url: { url: `data:${img.mime_type || "image/png"};base64,${img.base64}` } });
    }
  }
  try {
    const baseUrl = apiUrl.replace(/\/$/, "");
    const apiPath = baseUrl.includes("/v1/") ? "/chat/completions" : "/v1/chat/completions";
    const response = await fetch(baseUrl + apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "User-Agent": "dsh-mcp-server/1.0" },
      body: JSON.stringify({ model: modelName, messages: [{ role: "system", content: systemMsg }, { role: "user", content: userContent }], temperature: 0.1, max_tokens: 1e3 })
    });
    if (!response.ok) {
      const err = await response.text();
      return c.json({ error: `AI model API error (${response.status}): ${err}` }, 502);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content)
      return c.json({ error: "AI model returned empty response" }, 502);
    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m)
        extracted = JSON.parse(m[0]);
      else
        return c.json({ error: "Failed to parse AI response" }, 502);
    }
    if (!extracted.port)
      extracted.port = extracted.protocol === "http" ? 3128 : 1080;
    if (!extracted.protocol)
      extracted.protocol = "socks5";
    return c.json({ success: true, data: extracted });
  } catch (err) {
    return c.json({ error: `AI model call failed: ${err}` }, 502);
  }
});
var ai_default = app5;

// src/frontend/html.ts
var HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DSH \u670D\u52A1\u5668\u7BA1\u7406</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0f172a; --card-bg: #1e293b; --text: #e2e8f0;
      --text-dim: #94a3b8; --accent: #3b82f6; --green: #22c55e;
      --yellow: #eab308; --red: #ef4444; --border: #334155;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: var(--bg); color: var(--text); min-height: 100vh; }
    .nav { display: flex; gap: 0; background: var(--card-bg); border-bottom: 1px solid var(--border); }
    .nav button { padding: 12px 24px; background: none; color: var(--text-dim); border: none;
                  border-bottom: 2px solid transparent; cursor: pointer; font-size: 14px; }
    .nav button.active { color: var(--accent); border-bottom-color: var(--accent); }
    .header { display: flex; justify-content: space-between; align-items: center;
              padding: 16px 24px; gap: 12px; flex-wrap: wrap; }
    .header h1 { font-size: 20px; font-weight: 600; }
    .status-bar { display: flex; gap: 12px; align-items: center; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 16px; padding: 0 24px 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
            padding: 16px; position: relative; transition: border-color 0.2s; }
    .card:hover { border-color: var(--accent); }
    .card .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
    .card .title { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex;
                   align-items: center; justify-content: space-between; }
    .card .info-row { display: flex; justify-content: space-between; padding: 4px 0;
                      font-size: 13px; color: var(--text-dim); }
    .card .util-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;
                      flex: 1; margin: 0 8px; }
    .card .util-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .card .actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px;
                     border-top: 1px solid var(--border); }
    .card .actions button { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border);
                           background: none; color: var(--text); cursor: pointer; font-size: 12px; }
    .card .actions button:hover { background: var(--accent); border-color: var(--accent); }
    .card .actions button.danger:hover { background: var(--red); border-color: var(--red); }
    .btn-primary { padding: 8px 16px; border-radius: 8px; border: none;
                   background: var(--accent); color: white; cursor: pointer; font-size: 14px; }
    .btn-primary:hover { opacity: 0.9; }
    .search-input { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);
                    background: var(--card-bg); color: var(--text); font-size: 14px; width: 200px; }
    .ai-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 32px; }
    .ai-loading .spinner { width: 24px; height: 24px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ai-section { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .ai-section .title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--accent); }
    .ai-section textarea { width: 100%; min-height: 80px; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text); font-size: 13px; font-family: inherit; resize: vertical; }
    .ai-section textarea:focus { border-color: var(--accent); outline: none; }
    .img-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
    .img-grid .thumb { width: 80px; height: 60px; border-radius: 6px; overflow: hidden; position: relative; border: 1px solid var(--border); }
    .img-grid .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .img-grid .thumb .del { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(239,68,68,0.9); color: #fff; border: none; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .img-zone { border: 2px dashed var(--border); border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.3s; margin-top: 8px; }
    .img-zone:hover { border-color: var(--accent); background: rgba(59,130,246,0.05); }
    .img-zone .hint { font-size: 12px; color: var(--text-dim); }
    .extracted-info { padding: 12px 0; }
    .extracted-info .field { display: flex; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .extracted-info .field:last-child { border-bottom: none; }
    .extracted-info .field-label { min-width: 100px; color: var(--text-dim); font-size: 13px; }
    .extracted-info .field-value { flex: 1; font-size: 13px; word-break: break-all; }
    .extracted-info .field-value.key { font-family: monospace; font-size: 11px; max-height: 80px; overflow-y: auto; white-space: pre; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                     display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
             padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .modal h2 { margin-bottom: 16px; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 13px; color: var(--text-dim); margin-bottom: 4px; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border-radius: 6px;
      border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .toggle-group { display: flex; gap: 16px; }
    .toggle-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
    .verify-step { display: flex; align-items: center; gap: 8px; padding: 8px 0;
                   border-bottom: 1px solid var(--border); font-size: 14px; }
    .proxy-card { padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; }
    .proxy-card .proxy-name { font-weight: 600; }
    .proxy-card .proxy-info { font-size: 13px; color: var(--text-dim); }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px;
           background: var(--accent); font-size: 11px; margin: 2px; }
    .modal-title-bar { display: flex; justify-content: space-between; align-items: center; }
    .close-x { width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--text-dim); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .close-x:hover { background: rgba(239,68,68,0.15); color: var(--red); }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; padding: 0 12px 12px; }
      .header { flex-direction: column; align-items: stretch; }
      .form-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <button onclick="switchPage('servers')" id="nav-servers" class="active">\u{1F5A5}\uFE0F \u670D\u52A1\u5668</button>
    <button onclick="switchPage('proxies')" id="nav-proxies">\u{1F310} \u4EE3\u7406\u6C60</button>
    <button onclick="switchPage('logs')" id="nav-logs">\u{1F4CB} \u4F7F\u7528\u8BB0\u5F55</button>
  </nav>
  <div id="page-servers" class="page">
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px">
        <h1>\u670D\u52A1\u5668\u96C6\u7FA4</h1>
        <div class="status-bar" id="statusBar"></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input class="search-input" id="searchInput" placeholder="\u641C\u7D22\u540D\u79F0/IP..." oninput="renderServers()">
        <button class="btn-primary" onclick="probeAll()">\u{1F4E1} \u5168\u90E8\u63A2\u6D4B</button>
        <button class="btn-primary" onclick="showAddServer()">+ \u6DFB\u52A0</button>
      </div>
    </div>
    <div class="grid" id="serverGrid"></div>
  </div>
  <div id="page-proxies" class="page" style="display:none">
    <div class="header">
      <h1>\u4EE3\u7406\u8282\u70B9\u6C60</h1>
      <button class="btn-primary" onclick="showAddProxy()">+ \u6DFB\u52A0\u4EE3\u7406</button>
    </div>
    <div style="padding:0 24px 24px" id="proxyList"></div>
  </div>
  <div id="page-logs" class="page" style="display:none">
    <div class="header">
      <h1>\u4F7F\u7528\u8BB0\u5F55</h1>
    </div>
    <div style="padding:0 24px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="color:var(--text-dim);border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:8px">\u65F6\u95F4</th>
          <th style="text-align:left;padding:8px">\u670D\u52A1\u5668</th>
          <th style="text-align:left;padding:8px">Agent</th>
          <th style="text-align:left;padding:8px">\u4F1A\u8BDD</th>
          <th style="text-align:left;padding:8px">\u64CD\u4F5C</th>
        </tr></thead>
        <tbody id="logTableBody"></tbody>
      </table>
    </div>
  </div>
  <div id="modalContainer"></div>
  <script>
    let servers = [];
    let proxies = [];
    let logs = [];
    let currentPage = 'servers';

    const API = {
      servers: () => fetch('/api/servers').then(r => r.json()),
      serverById: (id) => fetch('/api/servers/'+id).then(r => r.json()),
      createServer: (data) => fetch('/api/servers', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      updateServer: (id, data) => fetch('/api/servers/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      deleteServer: (id) => fetch('/api/servers/'+id, { method:'DELETE' }).then(r => r.json()),
      enableServer: (id) => fetch('/api/servers/'+id+'/enable', { method:'POST' }).then(r => r.json()),
      disableServer: (id) => fetch('/api/servers/'+id+'/disable', { method:'POST' }).then(r => r.json()),
      proxies: () => fetch('/api/proxies').then(r => r.json()),
      createProxy: (data) => fetch('/api/proxies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      deleteProxy: (id) => fetch('/api/proxies/'+id, { method:'DELETE' }).then(r => r.json()),
      logs: () => fetch('/api/usage').then(r => r.json()),
      recordUsage: (data) => fetch('/api/usage', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      claimServer: (id, agent, task) => fetch('/api/servers/'+id+'/claim', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({agent, task}) }).then(r => r.json()),
      releaseServer: (id) => fetch('/api/servers/'+id+'/release', { method:'POST' }).then(r => r.json()),
    };

    function switchPage(page) {
      currentPage = page;
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      document.getElementById('page-'+page).style.display = 'block';
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      document.getElementById('nav-'+page).classList.add('active');
      if (page === 'servers') loadServers();
      else if (page === 'proxies') loadProxies();
      else if (page === 'logs') loadLogs();
    }

    async function loadServers() {
      try { servers = await API.servers(); renderServers(); }
      catch (e) { console.error('Failed to load servers', e); }
    }
    async function loadProxies() {
      try { proxies = await API.proxies(); renderProxies(); }
      catch (e) { console.error('Failed to load proxies', e); }
    }
    async function loadLogs() {
      try { logs = await API.logs(); renderLogs(); }
      catch (e) { console.error('Failed to load logs', e); }
    }

    function renderServers() {
      const search = (document.getElementById('searchInput').value || '').toLowerCase();
      const filtered = servers.filter(s => s.name.toLowerCase().includes(search) || s.host.includes(search));
      var isEnabled = function(s) { return s.enabled !== 0 && s.enabled !== false; };
      var online = filtered.filter(function(s){ return isEnabled(s) && s.status_online && wasRecentlyUsed(s); });
      var idle = filtered.filter(function(s){ return isEnabled(s) && s.status_online && !wasRecentlyUsed(s); });
      var offline = filtered.filter(function(s){ return isEnabled(s) && !s.status_online; });
      var disabled = filtered.filter(function(s){ return !isEnabled(s); });
      var statusBar = document.getElementById('statusBar');
      statusBar.innerHTML = '';
      [{label:'\u{1F7E2} '+online.length},{label:'\u{1F7E1} '+idle.length},{label:'\u{1F534} '+offline.length},{label:'\u26AA '+disabled.length+' \u5DF2\u7981\u7528'}].forEach(function(c) {
        var badge = document.createElement('span'); badge.className = 'status-badge'; badge.textContent = c.label; statusBar.appendChild(badge);
      });
      var grid = document.getElementById('serverGrid');
      grid.innerHTML = '';
      [...online, ...idle, ...offline, ...disabled].forEach(function(s) { grid.appendChild(createServerCard(s)); });
    }

    function wasRecentlyUsed(server) {
      return new Date(server.updated_at).getTime() > Date.now() - 5*60*1000;
    }

    function createServerCard(s) {
      const card = document.createElement('div'); card.className = 'card';
      var isEnabled = s.enabled !== 0 && s.enabled !== false;
      var isOnline = s.status_online;
      var dotColor = isOnline ? (wasRecentlyUsed(s) ? 'var(--green)' : 'var(--yellow)') : 'var(--red)';
      if (!isEnabled) card.style.opacity = '0.5';

      // Title row \u2014 safe textContent for user-controlled values
      const titleDiv = document.createElement('div'); titleDiv.className = 'title';
      const titleLeft = document.createElement('span');
      const dot = document.createElement('span'); dot.className = 'status-dot'; dot.style.background = dotColor;
      titleLeft.appendChild(dot);
      titleLeft.appendChild(document.createTextNode(s.name));
      titleDiv.appendChild(titleLeft);
      const statusSpan = document.createElement('span'); statusSpan.style.cssText = 'font-size:12px;color:var(--text-dim)';
      statusSpan.textContent = isOnline ? '\u5728\u7EBF' : '\u79BB\u7EBF';
      titleDiv.appendChild(statusSpan);
      if (!isEnabled) {
        var disabledBadge = document.createElement('span'); disabledBadge.style.cssText = 'font-size:11px;padding:2px 6px;border-radius:4px;background:var(--border);color:var(--text-dim);margin-left:6px';
        disabledBadge.textContent = '\u5DF2\u7981\u7528';
        titleDiv.appendChild(disabledBadge);
      }
      card.appendChild(titleDiv);

      // Info rows
      function addInfoRow(label, value) {
        const row = document.createElement('div'); row.className = 'info-row';
        const labelSpan = document.createElement('span'); labelSpan.textContent = label;
        const valueSpan = document.createElement('span'); valueSpan.textContent = value;
        row.appendChild(labelSpan); row.appendChild(valueSpan);
        card.appendChild(row);
      }
      addInfoRow('\u5730\u5740', s.host+':'+s.port);
      addInfoRow('GPU', s.gpu_model||'N/A');
      addInfoRow('CPU', s.cpu_cores?s.cpu_cores+'\u6838':'N/A');
      addInfoRow('\u5185\u5B58', s.ram_gb?s.ram_gb+'GB':'N/A');
      addInfoRow('Ping', s.status_ping_ms?s.status_ping_ms+'ms':'\u672A\u63A2\u6D4B');
      if (s.os_hint) addInfoRow('\u7CFB\u7EDF', s.os_hint);
      if (s.ssh_banner) {
        var ver = s.ssh_banner.match(/SSH-[d.]+-([^s]+)/);
        if (ver) addInfoRow('SSH', ver[1]);
      }

      // Task / occupancy display
      const isBusy = s.current_agent && s.current_task;
      if (isBusy) {
        const taskRow = document.createElement('div'); taskRow.className = 'info-row';
        taskRow.style.cssText = 'border-top:1px solid var(--border);padding-top:8px;margin-top:4px;color:var(--yellow)';
        const taskLabel = document.createElement('span'); taskLabel.textContent = '\u{1F4CB} \u4EFB\u52A1';
        const taskValue = document.createElement('span');
        taskValue.textContent = s.current_agent+' \u2192 '+s.current_task;
        if (s.task_started_at) {
          const elapsed = Math.floor((Date.now() - new Date(s.task_started_at).getTime())/60000);
          taskValue.textContent += ' ('+elapsed+'\u5206\u949F\u524D)';
        }
        taskRow.appendChild(taskLabel); taskRow.appendChild(taskValue);
        card.appendChild(taskRow);
      }

      // Actions row
      const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions';
      const addActionBtn = (label, clickFn, extraClass) => {
        const btn = document.createElement('button'); btn.textContent = label;
        if (extraClass) btn.className = extraClass;
        btn.onclick = clickFn; actionsDiv.appendChild(btn);
      };
      addActionBtn('\u8BE6\u60C5', () => showServerDetail(s.id));
      addActionBtn('\u7F16\u8F91', () => showEditServer(s.id));
      addActionBtn('\u63A2\u6D4B', () => probeServer(s.id));
      addActionBtn('\u5220\u9664', () => deleteServerConfirm(s.id), 'danger');
      if (isEnabled) {
        addActionBtn('\u7981\u7528', function() { API.disableServer(s.id).then(loadServers); });
      } else {
        addActionBtn('\u542F\u7528', function() { API.enableServer(s.id).then(loadServers); });
      }
      card.appendChild(actionsDiv);

      return card;
    }

    function renderProxies() {
      const container = document.getElementById('proxyList'); container.innerHTML = '';
      proxies.forEach(p => {
        const div = document.createElement('div'); div.className = 'proxy-card';
        const nameDiv = document.createElement('div'); nameDiv.className = 'proxy-name'; nameDiv.textContent = p.name;
        div.appendChild(nameDiv);
        const infoDiv = document.createElement('div'); infoDiv.className = 'proxy-info';
        infoDiv.textContent = p.protocol+'://'+p.host+':'+p.port+(p.location?' \xB7 '+p.location:'');
        div.appendChild(infoDiv);
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions'; actionsDiv.style.marginTop = '8px';
        const delBtn = document.createElement('button'); delBtn.textContent = '\u5220\u9664';
        delBtn.onclick = () => deleteProxyConfirm(p.id);
        actionsDiv.appendChild(delBtn);
        div.appendChild(actionsDiv);
        container.appendChild(div);
      });
      if (proxies.length===0) {
        const emptyP = document.createElement('p');
        emptyP.style.cssText = 'color:var(--text-dim);padding:24px;text-align:center';
        emptyP.textContent = '\u6682\u65E0\u4EE3\u7406\u8282\u70B9';
        container.appendChild(emptyP);
      }
    }

    function renderLogs() {
      const tbody = document.getElementById('logTableBody'); tbody.innerHTML = '';
      logs.forEach(l => {
        const tr = document.createElement('tr'); tr.style.borderBottom = '1px solid var(--border)';
        const addTd = (content, extraStyle) => {
          const td = document.createElement('td'); td.style.padding = '8px';
          if (extraStyle) td.style.cssText += extraStyle;
          td.textContent = content; tr.appendChild(td);
        };
        addTd(new Date(l.called_at).toLocaleString(), 'font-size:13px');
        addTd(l.server_id.substring(0,8)+'...');
        addTd(l.agent_id);
        addTd(l.session_id.substring(0,12)+'...', 'font-size:13px;color:var(--text-dim)');
        const tdAction = document.createElement('td'); tdAction.style.padding = '8px';
        const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = l.action;
        tdAction.appendChild(tag); tr.appendChild(tdAction);
        tbody.appendChild(tr);
      });
    }

    async function probeAll() { for (const s of servers) await probeServer(s.id); }

    async function probeServer(id) {
      showToast('\u23F3 \u6B63\u5728\u63A2\u6D4B...');
      var s = servers.find(function(x){ return x.id === id; });
      var name = s ? s.name : id.substring(0,8);
      try {
        const resp = await fetch('/api/servers/probe/'+id, { method:'POST' });
        const result = await resp.json();
        if (result.success) {
          var ms = result.latency_ms;
          var msText = (ms !== null && ms !== undefined) ? ms+'ms' : '\u8D85\u65F6';
          if (result.reachable) {
            showToast('\u2705 ' + name + ' ' + msText, 'success');
          } else {
            showToast('\u26A0\uFE0F ' + name + ' \u4E0D\u53EF\u8FBE (' + msText + ') ' + (result.error||''), 'error');
          }
          loadServers();
        } else {
          showToast('\u274C \u63A2\u6D4B\u5931\u8D25: ' + (result.error || '\u672A\u77E5\u9519\u8BEF'), 'error');
        }
      } catch(e) {
        showToast('\u274C \u63A2\u6D4B\u5931\u8D25: ' + e.message, 'error');
      }
    }

    function showModal(html) {
      // HTML modals: prepend X button, wrap content, no overlay-close
      var xBtn = '<button class="close-x" onclick="closeModal()">x</button>';
      // Find first heading and put X next to it, or put X at the top
      var content = html;
      // If starts with an h2, put X on the same line
      if (html.indexOf('<h2>') === 0) {
        var endH2 = html.indexOf('</h2>');
        var h2Content = html.substring(4, endH2);
        var rest = html.substring(endH2 + 5);
        content = '<div class="modal-title-bar"><h2 style="margin-bottom:0">' + h2Content + '</h2>' + xBtn + '</div>' + rest;
      } else {
        content = '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">' + xBtn + '</div>' + html;
      }
      document.getElementById('modalContainer').innerHTML = '<div class="modal-overlay"><div class="modal">' + content + '</div></div>';
    }
    function showModalWithElement(contentEl) {
      const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
      // overlay click does NOT close \u2014 only X or submit closes
      const modal = document.createElement('div'); modal.className = 'modal';
      // Prepend X button
      const xDiv = document.createElement('div'); xDiv.style.cssText = 'display:flex;justify-content:flex-end';
      const xBtn = document.createElement('button'); xBtn.className = 'close-x'; xBtn.textContent = 'x';
      xBtn.onclick = closeModal;
      xDiv.appendChild(xBtn);
      modal.appendChild(xDiv);
      modal.appendChild(contentEl);
      overlay.appendChild(modal);
      const container = document.getElementById('modalContainer'); container.innerHTML = '';
      container.appendChild(overlay);
    }
    function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

    // === Image state for the add-server form ===
    var pendingImages = [];

    // === Global paste: redirect to open the add-server form ===
    document.addEventListener('paste', function(e) {
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // If the add-server form is already open, add images to it
      if (document.getElementById('add-host')) {
        // Form is already open \u2014 send images there
        for (var i = 0; i < e.clipboardData.items.length; i++) {
          var item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            addImageFromBlob(item.getAsFile());
          }
        }
      } else {
        // Open the form and paste text if available
        var pasteText = e.clipboardData.getData('text');
        showAddServerWithText(pasteText || '');
        // Also handle images
        for (var i = 0; i < e.clipboardData.items.length; i++) {
          var item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            setTimeout(function(blob){ addImageFromBlob(blob); }, 100, item.getAsFile());
          }
        }
      }
      e.preventDefault();
    });

    function addImageFromBlob(blob) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        pendingImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
        renderImageThumbs();
      };
      reader.readAsDataURL(blob);
    }

    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function showToast(msg, type) {
      var existing = document.getElementById('dsh-toast');
      if (existing) existing.remove();
      var toast = document.createElement('div');
      toast.id = 'dsh-toast';
      toast.textContent = msg;
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:14px;z-index:9999;transition:opacity 0.3s;max-width:90%;text-align:center;' +
        (type==='error'?'background:#ef4444;color:#fff;':type==='success'?'background:#22c55e;color:#fff;':'background:var(--card-bg);color:var(--text);border:1px solid var(--border);');
      document.body.appendChild(toast);
      setTimeout(function(){ toast.style.opacity = '0'; setTimeout(function(){ toast.remove(); }, 300); }, type==='error'?4000:2000);
    }

    function showAddServerWithText(initialText) {
      showAddServer();
      if (initialText) {
        var ta = document.getElementById('ai-text');
        if (ta) { ta.value = initialText; }
      }
    }

    function renderImageThumbs() {
      var grid = document.getElementById('img-grid');
      if (!grid) return;
      grid.innerHTML = '';
      for (var i = 0; i < pendingImages.length; i++) {
        (function(idx) {
          var thumb = document.createElement('div'); thumb.className = 'thumb';
          var img = document.createElement('img');
          img.src = 'data:' + pendingImages[idx].mime_type + ';base64,' + pendingImages[idx].base64;
          var del = document.createElement('button'); del.className = 'del'; del.textContent = 'x';
          del.onclick = function() { pendingImages.splice(idx, 1); renderImageThumbs(); };
          thumb.appendChild(img); thumb.appendChild(del); grid.appendChild(thumb);
        })(i);
      }
    }

    function runAiExtract() {
      var text = document.getElementById('ai-text') ? document.getElementById('ai-text').value.trim() : '';
      var statusDiv = document.getElementById('ai-status');
      statusDiv.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI \u6B63\u5728\u8BC6\u522B\u670D\u52A1\u5668\u4FE1\u606F...</span></div>';

      if (!text && pendingImages.length === 0) {
        statusDiv.innerHTML = '<p style="color:var(--red)">\u8BF7\u7C98\u8D34\u6587\u672C\u6216\u4E0A\u4F20\u56FE\u7247\u540E\u518D\u63D0\u53D6</p>';
        return;
      }

      var body = {};
      if (text) body.text = text;
      if (pendingImages.length > 0) body.images = pendingImages;

      fetch('/api/ai/extract-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.success && result.data) {
          fillFormWithAI(result.data);
          statusDiv.innerHTML = '<p style="color:var(--green)">\u2705 AI \u8BC6\u522B\u5B8C\u6210\uFF0C\u5DF2\u81EA\u52A8\u586B\u5145\u8868\u5355</p>';
        } else {
          statusDiv.innerHTML = '<p style="color:var(--red)">\u274C ' + (result.error || 'AI \u8BC6\u522B\u5931\u8D25') + '</p>';
        }
      })
      .catch(function(err) {
        statusDiv.innerHTML = '<p style="color:var(--red)">\u274C \u7F51\u7EDC\u9519\u8BEF: ' + err.message + '</p>';
      });
    }

    function fillFormWithAI(d) {
      function setVal(id, val) {
        var el = document.getElementById(id);
        if (el) el.value = (val !== undefined && val !== null) ? String(val) : '';
      }
      setVal('add-name', d.name || d.host || '');
      setVal('add-host', d.host || '');
      setVal('add-port', d.port || 22);
      setVal('add-user', d.username || 'root');
      setVal('add-gpu', d.gpu_model || '');
      setVal('add-gpu-mem', d.gpu_memory_gb || '');
      setVal('add-cpu', d.cpu_cores || '');
      setVal('add-ram', d.ram_gb || '');
      if (d.vendor_url) setVal('add-vendor-url', d.vendor_url);
      if (d.notes) setVal('add-notes', d.notes);

      // Handle auth: fill key or password
      if (d.auth_method === 'key' && d.key_content) {
        var authSel = document.getElementById('add-auth-method');
        if (authSel) { authSel.value = 'key'; showKeyContent(d.key_content); }
      } else if (d.auth_method === 'password' && d.password) {
        var authSel = document.getElementById('add-auth-method');
        if (authSel) { authSel.value = 'password'; showPasswordField(d.password); }
      } else if (d.auth_method) {
        var authSel = document.getElementById('add-auth-method');
        if (authSel) { authSel.value = d.auth_method; triggerAuthChange(); }
      }
    }

    function showKeyContent(keyContent) {
      var c = document.getElementById('auth-fields');
      if (!c) return;
      c.innerHTML = '<div class="form-group"><label>SSH\u5BC6\u94A5\u5185\u5BB9</label><textarea id="add-key-content" rows="6" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;font-size:12px">' + escHtml(keyContent) + '</textarea></div>';
      // Store for later use when switching auth methods
      window._aiKeyContent = keyContent;
    }

    function showPasswordField(password) {
      var c = document.getElementById('auth-fields');
      if (!c) return;
      c.innerHTML = '<div class="form-group"><label>\u5BC6\u7801</label><input id="add-password" type="password" value="' + escHtml(password) + '"></div>';
      window._aiKeyContent = null;
    }

    function showAddServer() {
      pendingImages = [];
      showModal(
        '<h2>\u{1F4CB} \u6DFB\u52A0\u670D\u52A1\u5668</h2>' +
        // Unified AI input section
        '<div class="ai-section">' +
        '  <div class="title">\u{1F916} AI \u667A\u80FD\u5BFC\u5165 \u2014 \u7C98\u8D34\u6587\u672C/\u622A\u56FE\u6216\u76F4\u63A5\u8F93\u5165</div>' +
        '  <textarea id="ai-text" placeholder="\u5728\u6B64\u7C98\u8D34\u670D\u52A1\u5668\u914D\u7F6E\u6587\u672C\uFF08IP\u3001SSH\u5BC6\u94A5\u3001GPU\u4FE1\u606F\u7B49\uFF09\uFF0C\u4E5F\u53EF\u4EE5\u6309 Ctrl+V \u7C98\u8D34\u622A\u56FE\uFF0C\u6587\u672C\u548C\u56FE\u7247\u4E00\u8D77\u53D1\u9001\u7ED9 AI \u8BC6\u522B..."></textarea>' +
        '  <div class="img-grid" id="img-grid"></div>' +
        '  <div id="ai-status" style="margin-top:8px"></div>' +
        '  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '    <button class="btn-primary" onclick="document.getElementById(\\'img-input\\').click()">\u{1F4F7} \u9009\u62E9\u622A\u56FE</button>' +
        '    <button class="btn-primary" onclick="runAiExtract()">\u{1F916} AI \u63D0\u53D6</button>' +
        '  </div>' +
        '  <input type="file" accept="image/*" multiple style="display:none" id="img-input" onchange="handleImageFiles(this)">' +
        '</div>' +
        // Form section
        '<div class="form-group"><label>\u540D\u79F0</label><input id="add-name" placeholder="my-gpu-server"></div>' +
        '<div class="form-row"><div class="form-group"><label>\u5730\u5740</label><input id="add-host" placeholder="192.168.1.100"></div><div class="form-group"><label>SSH\u7AEF\u53E3</label><input id="add-port" value="22"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>\u7528\u6237\u540D</label><input id="add-user" value="root"></div><div class="form-group"><label>\u8BA4\u8BC1</label><select id="add-auth-method"><option value="key">SSH\u5BC6\u94A5</option><option value="password">\u5BC6\u7801</option></select></div></div>' +
        '<div id="auth-fields"><div class="form-group"><label>\u5BC6\u94A5\u8DEF\u5F84</label><input id="add-key-path" placeholder="/home/.ssh/id_rsa"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>GPU\u578B\u53F7</label><input id="add-gpu" placeholder="NVIDIA A100"></div><div class="form-group"><label>\u663E\u5B58GB</label><input id="add-gpu-mem" type="number"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>CPU\u6838\u6570</label><input id="add-cpu" type="number"></div><div class="form-group"><label>\u5185\u5B58GB</label><input id="add-ram" type="number"></div></div>' +
        '<div class="form-group"><label>\u5382\u5546URL</label><input id="add-vendor-url" placeholder="https://cloud.example.com"></div>' +
        '<div class="form-group"><label>\u5907\u6CE8</label><textarea id="add-notes" rows="2" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:13px;resize:vertical" placeholder="\u670D\u52A1\u5668\u7684\u7528\u9014\u3001\u6CE8\u610F\u4E8B\u9879\u7B49"></textarea></div>' +
        '<div style="margin:12px 0"><strong>\u8FDE\u63A5\u65B9\u5F0F</strong></div>' +
        '<div class="toggle-group"><label><input type="checkbox" id="add-v2ray"> \u6709V2RayN</label><label><input type="checkbox" id="add-direct-proxy" checked> V2RayN\u65F6\u53EF\u76F4\u8FDE</label><label><input type="checkbox" id="add-direct-no-proxy"> \u65E0\u4EE3\u7406\u65F6\u76F4\u8FDE</label></div>' +
        '<div id="verify-results" style="margin-top:12px"></div>' +
        '<div class="modal-actions"><button class="btn-primary" onclick="verifyAndSave()">\u9A8C\u8BC1\u5E76\u4FDD\u5B58</button><button onclick="closeModal()">\u53D6\u6D88</button></div>'
      );

      // Wire up paste on the textarea to capture images
      var textarea = document.getElementById('ai-text');
      if (textarea) {
        textarea.onpaste = function(e) {
          var hasImage = false;
          for (var i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
              hasImage = true;
              addImageFromBlob(e.clipboardData.items[i].getAsFile());
            }
          }
          // If there was an image, prevent the default (don't paste binary junk into textarea)
          if (hasImage) e.preventDefault();
        };
      }

      // Wire up auth method toggle
      document.getElementById('add-auth-method').onchange = triggerAuthChange;
    }

    function triggerAuthChange() {
      var c = document.getElementById('auth-fields');
      if (!c) return;
      var sel = document.getElementById('add-auth-method');
      if (sel.value === 'key') {
        // If AI previously extracted a key, show it in a textarea
        if (window._aiKeyContent) {
          showKeyContent(window._aiKeyContent);
        } else {
          c.innerHTML = '<div class="form-group"><label>\u5BC6\u94A5\u8DEF\u5F84</label><input id="add-key-path" placeholder="/home/.ssh/id_rsa"></div>';
        }
      } else {
        c.innerHTML = '<div class="form-group"><label>\u5BC6\u7801</label><input id="add-password" type="password"></div>';
      }
    }

    function handleImageFiles(input) {
      if (!input.files || input.files.length === 0) return;
      for (var i = 0; i < input.files.length; i++) {
        (function(blob) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            pendingImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
            renderImageThumbs();
          };
          reader.readAsDataURL(blob);
        })(input.files[i]);
      }
      input.value = '';
    }

    async function verifyAndSave() {
      const host = document.getElementById('add-host').value;
      const port = parseInt(document.getElementById('add-port').value) || 22;
      const resultsDiv = document.getElementById('verify-results');
      resultsDiv.textContent = '\u23F3 \u9A8C\u8BC1\u4E2D...';
      const response = await fetch('/api/verify-server', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({host,port}) });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      resultsDiv.innerHTML = '';
      while(true) {
        const {done,value} = await reader.read();
        if(done) break;
        const lines = decoder.decode(value).split('\\n').filter(l=>l.startsWith('data: '));
        for(const line of lines) {
          const data = JSON.parse(line.slice(6));
          const stepEl = document.createElement('div'); stepEl.className = 'verify-step';
          if(data.step==='direct_ssh') {
            stepEl.textContent = (data.status==='running'?'\u23F3':data.status==='success'?'\u2705':'\u274C')+' \u76F4\u8FDESSH '+(data.latency_ms?data.latency_ms+'ms':'')+' '+(data.error||'');
          } else if(data.step==='proxy_ssh') {
            stepEl.textContent = (data.status==='running'?'\u23F3':data.status==='success'?'\u2705':'\u274C')+' '+data.proxy_name+' '+(data.latency_ms?data.latency_ms+'ms':'')+' '+(data.error||'');
          } else if(data.step==='complete' && data.best_proxy) {
            stepEl.style.color = 'var(--green)';
            stepEl.textContent = '\u2705 \u63A8\u8350: '+data.best_proxy.name+' ('+data.best_proxy.latency_ms+'ms)';
          }
          resultsDiv.appendChild(stepEl);
        }
      }
      var keyContentEl = document.getElementById('add-key-content');
      var passwordEl = document.getElementById('add-password');
      var vendorUrlEl = document.getElementById('add-vendor-url');
      var authMethod = document.getElementById('add-auth-method').value;
      const serverData = {
        name: document.getElementById('add-name').value, host: host, port: port,
        username: document.getElementById('add-user').value, auth_method: authMethod,
        key_content: (authMethod === 'key' && keyContentEl) ? keyContentEl.value : null,
        password: (authMethod === 'password' && passwordEl) ? passwordEl.value : null,
        gpu_model: document.getElementById('add-gpu').value||null, gpu_memory_gb: document.getElementById('add-gpu-mem').value?parseInt(document.getElementById('add-gpu-mem').value):null,
        cpu_cores: document.getElementById('add-cpu').value?parseInt(document.getElementById('add-cpu').value):null, ram_gb: document.getElementById('add-ram').value?parseInt(document.getElementById('add-ram').value):null,
        v2ray_available: document.getElementById('add-v2ray').checked, direct_when_proxy_available: document.getElementById('add-direct-proxy').checked, direct_when_no_proxy: document.getElementById('add-direct-no-proxy').checked,
        vendor_url: vendorUrlEl ? (vendorUrlEl.value||null) : null,
        notes: document.getElementById('add-notes') ? document.getElementById('add-notes').value||null : null,
      };
      if (!serverData.name||!serverData.host||!serverData.username) { resultsDiv.innerHTML += '<p style="color:var(--red)">\u8BF7\u586B\u5199\u5FC5\u586B\u5B57\u6BB5</p>'; return; }
      try {
        const result = await API.createServer(serverData);
        resultsDiv.innerHTML += '<p style="color:var(--green)">\u2705 \u5DF2\u4FDD\u5B58</p>';
        setTimeout(()=>{closeModal();loadServers();},1000);
      } catch(e) { resultsDiv.innerHTML += '<p style="color:var(--red)">\u274C \u4FDD\u5B58\u5931\u8D25: '+e+'</p>'; }
    }

    var pendingProxyImages = [];

    function showAddProxy() {
      pendingProxyImages = [];
      showModal(
        '<h2>\u{1F310} \u6DFB\u52A0\u4EE3\u7406\u8282\u70B9</h2>' +
        '<div class="ai-section">' +
        '  <div class="title">\u{1F916} AI \u667A\u80FD\u5BFC\u5165 \u2014 \u7C98\u8D34\u4EE3\u7406\u914D\u7F6E\u6587\u672C\u6216\u622A\u56FE</div>' +
        '  <textarea id="proxy-ai-text" placeholder="\u5728\u6B64\u7C98\u8D34\u4EE3\u7406\u8282\u70B9\u914D\u7F6E\uFF08\u8BA2\u9605\u94FE\u63A5\u3001\u8282\u70B9\u4FE1\u606F\u3001VPN\u914D\u7F6E\u7B49\uFF09\uFF0C\u4E5F\u53EF\u4EE5\u6309 Ctrl+V \u7C98\u8D34\u622A\u56FE..."></textarea>' +
        '  <div class="img-grid" id="proxy-img-grid"></div>' +
        '  <div id="proxy-ai-status" style="margin-top:8px"></div>' +
        '  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '    <button class="btn-primary" onclick="pickProxyImage()">\u{1F4F7} \u9009\u62E9\u622A\u56FE</button>' +
        '    <button class="btn-primary" onclick="runProxyAiExtract()">\u{1F916} AI \u63D0\u53D6</button>' +
        '  </div>' +
        '  <input type="file" accept="image/*" multiple style="display:none" id="proxy-img-input" onchange="handleProxyImageFiles(this)">' +
        '</div>' +
        '<div class="form-group"><label>\u540D\u79F0</label><input id="proxy-name" placeholder="HK-Node-1"></div>' +
        '<div class="form-row"><div class="form-group"><label>\u5730\u5740</label><input id="proxy-host" placeholder="127.0.0.1"></div><div class="form-group"><label>\u7AEF\u53E3</label><input id="proxy-port" value="1080"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>\u534F\u8BAE</label><select id="proxy-protocol"><option value="socks5">SOCKS5</option><option value="http">HTTP</option></select></div><div class="form-group"><label>\u4F4D\u7F6E</label><input id="proxy-location" placeholder="\u9999\u6E2F"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>\u7528\u6237\u540D</label><input id="proxy-user" placeholder="(\u53EF\u9009)"></div><div class="form-group"><label>\u5BC6\u7801</label><input id="proxy-pass" type="password" placeholder="(\u53EF\u9009)"></div></div>' +
        '<div class="modal-actions"><button class="btn-primary" onclick="saveProxy()">\u4FDD\u5B58</button><button onclick="closeModal()">\u53D6\u6D88</button></div>'
      );

      // Wire up paste on textarea to capture images
      var ta = document.getElementById('proxy-ai-text');
      if (ta) {
        ta.onpaste = function(e) {
          var hasImage = false;
          for (var i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
              hasImage = true;
              addProxyImage(e.clipboardData.items[i].getAsFile());
            }
          }
          if (hasImage) e.preventDefault();
        };
      }
    }

    function pickProxyImage() { var el = document.getElementById('proxy-img-input'); if(el) el.click(); }

    function addProxyImage(blob) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        pendingProxyImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
        renderProxyImageThumbs();
      };
      reader.readAsDataURL(blob);
    }

    function renderProxyImageThumbs() {
      var grid = document.getElementById('proxy-img-grid');
      if (!grid) return;
      grid.innerHTML = '';
      for (var i = 0; i < pendingProxyImages.length; i++) {
        (function(idx) {
          var thumb = document.createElement('div'); thumb.className = 'thumb';
          var img = document.createElement('img');
          img.src = 'data:' + pendingProxyImages[idx].mime_type + ';base64,' + pendingProxyImages[idx].base64;
          var del = document.createElement('button'); del.className = 'del'; del.textContent = 'x';
          del.onclick = function() { pendingProxyImages.splice(idx, 1); renderProxyImageThumbs(); };
          thumb.appendChild(img); thumb.appendChild(del); grid.appendChild(thumb);
        })(i);
      }
    }

    function handleProxyImageFiles(input) {
      if (!input.files || input.files.length === 0) return;
      for (var i = 0; i < input.files.length; i++) {
        (function(blob) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            pendingProxyImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
            renderProxyImageThumbs();
          };
          reader.readAsDataURL(blob);
        })(input.files[i]);
      }
      input.value = '';
    }

    function runProxyAiExtract() {
      var text = document.getElementById('proxy-ai-text') ? document.getElementById('proxy-ai-text').value.trim() : '';
      var statusDiv = document.getElementById('proxy-ai-status');
      statusDiv.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI \u6B63\u5728\u8BC6\u522B\u4EE3\u7406\u4FE1\u606F...</span></div>';

      if (!text && pendingProxyImages.length === 0) {
        statusDiv.innerHTML = '<p style="color:var(--red)">\u8BF7\u7C98\u8D34\u6587\u672C\u6216\u4E0A\u4F20\u56FE\u7247\u540E\u518D\u63D0\u53D6</p>';
        return;
      }

      var body = {};
      if (text) body.text = text;
      if (pendingProxyImages.length > 0) body.images = pendingProxyImages;

      fetch('/api/ai/extract-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.success && result.data) {
          var d = result.data;
          function setVal(id, val) {
            var el = document.getElementById(id);
            if (el) el.value = (val !== undefined && val !== null) ? String(val) : '';
          }
          setVal('proxy-name', d.name || d.host || '');
          setVal('proxy-host', d.host || '');
          setVal('proxy-port', d.port || 1080);
          setVal('proxy-location', d.location || '');
          setVal('proxy-user', d.username || '');
          setVal('proxy-pass', d.password || '');
          if (d.protocol) {
            var sel = document.getElementById('proxy-protocol');
            if (sel) sel.value = d.protocol;
          }
          statusDiv.innerHTML = '<p style="color:var(--green)">\u2705 AI \u8BC6\u522B\u5B8C\u6210\uFF0C\u5DF2\u81EA\u52A8\u586B\u5145</p>';
        } else {
          statusDiv.innerHTML = '<p style="color:var(--red)">\u274C ' + (result.error || '\u8BC6\u522B\u5931\u8D25') + '</p>';
        }
      })
      .catch(function(err) {
        statusDiv.innerHTML = '<p style="color:var(--red)">\u274C \u7F51\u7EDC\u9519\u8BEF: ' + err.message + '</p>';
      });
    }

    async function saveProxy() {
      var nameEl = document.getElementById('proxy-name');
      var hostEl = document.getElementById('proxy-host');
      var portEl = document.getElementById('proxy-port');
      var locationEl = document.getElementById('proxy-location');
      var protocolEl = document.getElementById('proxy-protocol');
      if (!nameEl || !hostEl || !nameEl.value || !hostEl.value) { showToast('\u8BF7\u586B\u5199\u540D\u79F0\u548C\u5730\u5740', 'error'); return; }
      var userEl = document.getElementById('proxy-user');
      var passEl = document.getElementById('proxy-pass');
      var data = {
        name: nameEl.value,
        host: hostEl.value,
        port: parseInt(portEl ? portEl.value : '1080') || 1080,
        username: userEl ? (userEl.value||null) : null,
        password: passEl ? (passEl.value||null) : null,
        location: locationEl ? (locationEl.value||null) : null,
        protocol: protocolEl ? protocolEl.value : 'socks5'
      };
      await API.createProxy(data); closeModal(); loadProxies();
    }
    async function deleteServerConfirm(id) { if(confirm('\u786E\u5B9A\u5220\u9664\uFF1F')){await API.deleteServer(id);loadServers();} }
    async function deleteProxyConfirm(id) { if(confirm('\u786E\u5B9A\u5220\u9664\uFF1F')){await API.deleteProxy(id);loadProxies();} }
    function showServerDetail(id) {
      const s = servers.find(x=>x.id===id); if(!s) return;
      const modalContent = document.createElement('div');
      const h2 = document.createElement('h2'); h2.textContent = s.name; modalContent.appendChild(h2);
      const addRow = (label, value) => {
        const row = document.createElement('div'); row.className = 'info-row';
        const lbl = document.createElement('span'); lbl.textContent = label;
        const val = document.createElement('span'); val.textContent = value;
        row.appendChild(lbl); row.appendChild(val); modalContent.appendChild(row);
      };
      addRow('\u5730\u5740', s.host+':'+s.port);
      addRow('\u72B6\u6001', s.status_online?'\u{1F7E2}\u5728\u7EBF':'\u{1F534}\u79BB\u7EBF');
      const actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions';
      const closeBtn = document.createElement('button'); closeBtn.textContent = '\u5173\u95ED';
      closeBtn.onclick = closeModal; actionsDiv.appendChild(closeBtn);
      modalContent.appendChild(actionsDiv);
      showModalWithElement(modalContent);
    }
    function showEditServer(id) {
      // Fetch full server details first
      showModal('<div class="ai-loading"><div class="spinner"></div><span>\u52A0\u8F7D\u670D\u52A1\u5668\u4FE1\u606F...</span></div>');
      API.serverById(id).then(function(s) {
        var content = document.createElement('div');
        var h2 = document.createElement('h2'); h2.textContent = '\u270F\uFE0F \u7F16\u8F91\u670D\u52A1\u5668'; content.appendChild(h2);

        function addField(label, html) {
          var group = document.createElement('div'); group.className = 'form-group';
          var lbl = document.createElement('label'); lbl.textContent = label;
          group.appendChild(lbl);
          // html is a string of innerHTML for the input element
          var wrapper = document.createElement('div'); wrapper.innerHTML = html;
          group.appendChild(wrapper.firstChild);
          content.appendChild(group);
        }
        function addInput(label, inputId, type, value) {
          addField(label, '<input id="'+inputId+'" type="'+type+'" value="'+escHtml(String(value!=null?value:''))+'">');
        }

        addInput('\u540D\u79F0', 'edit-name', 'text', s.name);
        addInput('\u5730\u5740', 'edit-host', 'text', s.host);
        addInput('\u7AEF\u53E3', 'edit-port', 'text', s.port);
        addInput('\u7528\u6237\u540D', 'edit-user', 'text', s.username);

        // Auth method selector
        addField('\u8BA4\u8BC1\u65B9\u5F0F', '<select id="edit-auth-method"><option value="key"'+(s.auth_method==='key'?' selected':'')+'>SSH\u5BC6\u94A5</option><option value="password"'+(s.auth_method==='password'?' selected':'')+'>\u5BC6\u7801</option></select>');

        // Auth fields: key content or password
        var authHtml = '';
        if (s.auth_method === 'key') {
          authHtml = '<div class="form-group"><label>SSH\u5BC6\u94A5\u5185\u5BB9</label><textarea id="edit-key-content" rows="6" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;font-size:12px">'+escHtml(s.key_content||'')+'</textarea></div>';
        } else {
          authHtml = '<div class="form-group"><label>\u5BC6\u7801</label><input id="edit-password" type="password" value="'+escHtml(s.password||'')+'"></div>';
        }
        var authDiv = document.createElement('div'); authDiv.id = 'edit-auth-fields'; authDiv.innerHTML = authHtml;
        content.appendChild(authDiv);

        // Wire up auth method toggle
        setTimeout(function() {
          var sel = document.getElementById('edit-auth-method');
          if (sel) sel.onchange = function() {
            var c = document.getElementById('edit-auth-fields');
            if (this.value === 'key') {
              c.innerHTML = '<div class="form-group"><label>SSH\u5BC6\u94A5\u5185\u5BB9</label><textarea id="edit-key-content" rows="6" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;font-size:12px"></textarea></div>';
            } else {
              c.innerHTML = '<div class="form-group"><label>\u5BC6\u7801</label><input id="edit-password" type="password"></div>';
            }
          };
        }, 50);

        addInput('GPU\u578B\u53F7', 'edit-gpu', 'text', s.capabilities?.gpu_model||s.gpu_model||'');
        addInput('\u663E\u5B58(GB)', 'edit-gpu-mem', 'number', s.capabilities?.gpu_memory_gb||s.gpu_memory_gb||'');
        addInput('CPU\u6838\u6570', 'edit-cpu', 'number', s.capabilities?.cpu_cores||s.cpu_cores||'');
        addInput('\u5185\u5B58(GB)', 'edit-ram', 'number', s.capabilities?.ram_gb||s.ram_gb||'');
        addInput('\u78C1\u76D8(GB)', 'edit-disk', 'number', s.capabilities?.disk_gb||s.disk_gb||'');
        addInput('\u5382\u5546URL', 'edit-vendor-url', 'text', s.vendor_url||'');

        // Notes field
        var notesGroup = document.createElement('div'); notesGroup.className = 'form-group';
        var notesLabel = document.createElement('label'); notesLabel.textContent = '\u5907\u6CE8';
        notesGroup.appendChild(notesLabel);
        var notesTa = document.createElement('textarea'); notesTa.id = 'edit-notes';
        notesTa.style.cssText = 'width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:13px;resize:vertical;min-height:40px';
        notesTa.textContent = s.notes||'';
        notesGroup.appendChild(notesTa);
        content.appendChild(notesGroup);

        // Connection mode toggles
        var connDiv = document.createElement('div');
        connDiv.innerHTML = '<div style="margin:12px 0"><strong>\u8FDE\u63A5\u65B9\u5F0F</strong></div>'+
          '<div class="toggle-group">'+
          '<label><input type="checkbox" id="edit-v2ray"'+(s.proxy?.v2ray_available||s.v2ray_available?' checked':'')+'> \u6709V2RayN</label>'+
          '<label><input type="checkbox" id="edit-direct-proxy"'+(s.proxy?.direct_when_proxy_available||s.direct_when_proxy_available?' checked':'')+'> V2RayN\u65F6\u53EF\u76F4\u8FDE</label>'+
          '<label><input type="checkbox" id="edit-direct-no-proxy"'+(s.proxy?.direct_when_no_proxy||s.direct_when_no_proxy?' checked':'')+'> \u65E0\u4EE3\u7406\u65F6\u76F4\u8FDE</label>'+
          '</div>';
        content.appendChild(connDiv);

        var actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions';
        var saveBtn = document.createElement('button'); saveBtn.className = 'btn-primary';
        saveBtn.textContent = '\u4FDD\u5B58'; saveBtn.onclick = function() { saveEditServer(id); };
        actionsDiv.appendChild(saveBtn);
        var cancelBtn = document.createElement('button'); cancelBtn.textContent = '\u53D6\u6D88';
        cancelBtn.onclick = closeModal; actionsDiv.appendChild(cancelBtn);
        content.appendChild(actionsDiv);
        showModalWithElement(content);
      }).catch(function(err) {
        showModal('<h2>\u274C \u52A0\u8F7D\u5931\u8D25</h2><p style="color:var(--red)">'+err.message+'</p><div class="modal-actions"><button class="btn-primary" onclick="closeModal()">\u5173\u95ED</button></div>');
      });
    }
    async function saveEditServer(id) {
      var updates = {
        name: document.getElementById('edit-name').value,
        host: document.getElementById('edit-host').value,
        port: parseInt(document.getElementById('edit-port').value)||22,
        username: document.getElementById('edit-user').value,
        auth_method: document.getElementById('edit-auth-method').value,
        gpu_model: document.getElementById('edit-gpu').value||null,
        gpu_memory_gb: document.getElementById('edit-gpu-mem').value ? parseInt(document.getElementById('edit-gpu-mem').value) : null,
        cpu_cores: document.getElementById('edit-cpu').value ? parseInt(document.getElementById('edit-cpu').value) : null,
        ram_gb: document.getElementById('edit-ram').value ? parseInt(document.getElementById('edit-ram').value) : null,
        disk_gb: document.getElementById('edit-disk').value ? parseInt(document.getElementById('edit-disk').value) : null,
        vendor_url: document.getElementById('edit-vendor-url').value||null,
        notes: document.getElementById('edit-notes') ? document.getElementById('edit-notes').value||null : null,
        v2ray_available: document.getElementById('edit-v2ray').checked ? 1 : 0,
        direct_when_proxy_available: document.getElementById('edit-direct-proxy').checked ? 1 : 0,
        direct_when_no_proxy: document.getElementById('edit-direct-no-proxy').checked ? 1 : 0,
      };
      // Read key or password based on auth method
      var keyContentEl = document.getElementById('edit-key-content');
      var passwordEl = document.getElementById('edit-password');
      if (keyContentEl) updates.key_content = keyContentEl.value;
      if (passwordEl) updates.password = passwordEl.value;
      await API.updateServer(id, updates);
      closeModal(); loadServers();
    }
    switchPage('servers');
    setInterval(()=>{if(currentPage==='servers')loadServers();},30000);
  <\/script>
</body>
</html>`;

// src/index.ts
var app6 = new Hono2();
app6.use("*", cors());
app6.get("/mcp", async (c) => {
  const session = createSession();
  return handleSseConnection(c, session.id);
});
app6.post("/mcp", async (c) => {
  const body = await c.req.json();
  const ctx = { env: c.env, db: c.env.DB };
  const sessionId = c.req.query("session") || c.req.header("Mcp-Session-Id");
  if (sessionId && getSession(sessionId)) {
    const response2 = await handleMcpRequest(body, ctx);
    sendResponse(sessionId, response2);
    return c.json({ accepted: true });
  }
  const response = await handleMcpRequest(body, ctx);
  if (body?.method === "initialize") {
    const newSession = createSession();
    c.header("Mcp-Session-Id", newSession.id);
  }
  return c.json(response);
});
app6.route("/api/servers", servers_default);
app6.route("/api/proxies", proxies_default);
app6.route("/api/verify-server", verify_default);
app6.route("/api/usage", usage_default);
app6.route("/api/ai", ai_default);
app6.get("/", (c) => {
  return c.html(HTML);
});
app6.get("/index.html", (c) => {
  return c.html(HTML);
});
var src_default = app6;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-EAA0u5/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-EAA0u5/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
