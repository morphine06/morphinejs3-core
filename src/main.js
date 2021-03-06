const chalk = require("chalk");
const http = require("http");

import { App } from "./App";
import { Services, Service, loadServices } from "./Services";
import { Config } from "./Config";
import { Controller, loadControllers } from "./Controller";
import { Get, Post, Put, Delete, Crud } from "./MethodDecorators";
import { Middlewares, Middleware, loadRoutesMiddlewares } from "./Middlewares";

import dayjs from "dayjs";
import { DbMysql, Model, Models, Migration, loadModels } from "./DbMysql";

const rootDir = process.cwd();

// console.log("PPPPPPPPOOOOOOOOOOOOOPPPPPP");

const MorphineJs = class {
	constructor() {}

	async initDb() {
		await DbMysql.init(Config.mysql);
		await loadModels();
	}
	async executeMigration() {
		Migration.update();
	}
	async initBootstrap() {}
	async initExpress() {}
	async initMiddlewares() {}
	async initHttpServer() {
		let httpserver = http.createServer(App);
		await new Promise((accept, reject) => {
			httpserver.listen(Config.app.port, () => {
				accept();
			});
		});
		console.warn(chalk.green(`Listening on ${Config.app.host} ! - ${Config.app.mode} - ${dayjs().format("YYYY-MM-DD HH:mm")}`));
		if (Config.app.mode !== "production") {
			if (Config.mysql.migrate == "alter") console.warn(chalk.red(`To speedup startup change Config.mysql.migrate to 'safe'`));
			else console.warn(chalk.red(`Auto-migrate is disabled, change Config.mysql.migrate to 'alter' if you do breaking change to database`));
			return httpserver;
		}
	}
	initResSendData() {
		return function (req, res, next) {
			if (!Services.ErrorCodes) return next();
			res.sendData = function (errorKeyOrData, status = 200) {
				let data;
				errorKeyOrData = errorKeyOrData || {};
				if (errorKeyOrData && typeof errorKeyOrData === "string") {
					data = { err: Services.ErrorCodes.getErrorCode(errorKeyOrData) };
					status = data.err.status;
				} else {
					data = errorKeyOrData;
					data.err = null;
					if (!data.meta) data.meta = {};
				}
				res.status(status).send(data);
			};
			next();
		};
	}
	async notFound() {}

	async start() {
		await this.initDb();
		await this.executeMigration();
		// await loadServices();
		await this.initExpress();
		await this.initBootstrap();
		await this.initMiddlewares();
		// this.initResSendData();
		this.httpserver = await this.initHttpServer();
	}
};

export {
	rootDir,
	MorphineJs,
	Config,
	App,
	Controller,
	Crud,
	Get,
	Post,
	Put,
	Delete,
	DbMysql,
	Models,
	Model,
	Services,
	Service,
	Middleware,
	Middlewares,
	Migration,
	loadRoutesMiddlewares,
	loadControllers,
	loadServices,
	loadModels,
};
