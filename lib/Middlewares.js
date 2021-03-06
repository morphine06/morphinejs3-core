"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Middleware = Middleware;
exports.Middlewares = void 0;
exports.loadRoutesMiddlewares = loadRoutesMiddlewares;

var _globule = _interopRequireDefault(require("globule"));

var _chalk = _interopRequireDefault(require("chalk"));

var _Config = require("./Config");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Middlewares = [];
exports.Middlewares = Middlewares;

function Middleware() {
  var middlewares = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  if (middlewares instanceof Array) {} else middlewares = [middlewares];

  return function (target, name, descriptor) {
    if (name) {
      var original = descriptor.value;

      if (typeof original === "function") {
        descriptor.value = /*#__PURE__*/_asyncToGenerator(function* () {
          var _this = this;

          try {
            var continuePlease = true;

            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            if (target._middlewaresByRoute && target._middlewaresByRoute[name]) {
              var _loop = function* _loop(iMid) {
                var middlewareName = target._middlewaresByRoute[name][iMid];
                var mid = Middlewares.find(m => m.name == middlewareName);

                if (mid) {
                  var isCalled = false;

                  var next = function next() {
                    isCalled = true;
                  };

                  yield mid.fn.apply(_this, [args[0], args[1], next]);

                  if (!isCalled) {
                    continuePlease = false;
                    return "break";
                  }
                } else {
                  console.warn("Middleware '".concat(middlewareName, "' not found."));
                }
              };

              for (var iMid = 0; iMid < target._middlewaresByRoute[name].length; iMid++) {
                var _ret = yield* _loop(iMid);

                if (_ret === "break") break;
              }
            }

            if (continuePlease) yield original.apply(this, args);
          } catch (e) {
            throw e;
          }
        });
        if (!target._middlewaresByRoute) target._middlewaresByRoute = {};
        if (!target._middlewaresByRoute[name]) target._middlewaresByRoute[name] = [];
        target._middlewaresByRoute[name] = [...target._middlewaresByRoute[name], ...middlewares];
      }

      return descriptor;
    } else {
      if (!target.prototype._middlewares) target.prototype._middlewares = [];
      target.prototype._middlewares = [...target.prototype._middlewares, ...middlewares];
    }
  };
}

function loadRoutesMiddlewares() {
  return _loadRoutesMiddlewares.apply(this, arguments);
}

function _loadRoutesMiddlewares() {
  _loadRoutesMiddlewares = _asyncToGenerator(function* () {
    console.warn(_chalk.default.yellow("@Info - Middlewares availables :"));
    var where = "/src";
    if (_Config.Config.app.mode == "production") where = "/lib";

    var middlewareFiles = _globule.default.find(process.cwd() + where + "/**/*.middleware.js");

    for (var i = 0; i < middlewareFiles.length; i++) {
      var middlewareFile = middlewareFiles[i];
      var obj = yield Promise.resolve("".concat(middlewareFile)).then(s => _interopRequireWildcard(require(s))); // let d = new Date();

      Object.entries(obj).forEach((_ref2, index) => {
        var [name, constructorFn] = _ref2;
        Middlewares.push({
          name,
          fn: constructorFn
        });
        console.warn("- ".concat(name, "()"));
      }); // console.log("d oooo", new Date() - d);
    }
  });
  return _loadRoutesMiddlewares.apply(this, arguments);
}
//# sourceMappingURL=Middlewares.js.map