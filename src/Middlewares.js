import globule from "globule";

const Middlewares = [];

function Middleware(middlewares = []) {
	if (middlewares instanceof Array) {
	} else middlewares = [middlewares];
	return function (target, name, descriptor) {
		if (name) {
			const original = descriptor.value;
			if (typeof original === "function") {
				descriptor.value = async function (...args) {
					// console.log("args", args.length);
					try {
						let continuePlease = true;
						if (target._middlewaresByRoute && target._middlewaresByRoute[name]) {
							for (let iMid = 0; iMid < target._middlewaresByRoute[name].length; iMid++) {
								const middlewareName = target._middlewaresByRoute[name][iMid];
								let mid = Middlewares.find((m) => m.name == middlewareName);
								if (mid) {
									let isCalled = false;
									const next = function () {
										isCalled = true;
									};
									await mid.fn.apply(this, [args[0], args[1], next]);
									console.log("isCalled", isCalled);
									if (!isCalled) {
										continuePlease = false;
										break;
									}
								} else {
									console.warn(`Middleware '${middlewareName}' not found.`);
								}
							}
						}
						if (continuePlease) await original.apply(this, args);
					} catch (e) {
						throw e;
					}
				};
				// console.log("target", target);
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

async function loadRoutesMiddlewares() {
	let middlewareFiles = globule.find(process.cwd() + "/src/**/*.middleware.js");
	// console.log("middlewareFiles", middlewareFiles);
	for (let i = 0; i < middlewareFiles.length; i++) {
		const middlewareFile = middlewareFiles[i];
		let obj = await import(middlewareFile);
		Object.entries(obj).forEach(([name, constructorFn], index) => {
			Middlewares.push({ name, fn: constructorFn });
		});
	}
}

export { Middlewares, Middleware, loadRoutesMiddlewares };