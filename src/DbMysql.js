var path = require("path");
var mysql = require("mysql2/promise");

var globule = require("globule");
var DbTable = require("./DbTable");

var DbMysql = new (class {
	constructor() {
		this.models = {};
	}
	async init(config) {
		this.config = config;
		var pool = mysql.createPool(this.config.connection);
		this.connection = {
			pool: pool,
			query: async function (sql, sqlData = [], catchError = false) {
				let connection;
				try {
					connection = await this.pool.getConnection();
				} catch (error) {
					console.warn("connection-error", error);
					return null;
				}
				try {
					let results = await connection.query(sql, sqlData);
					// console.log("sql, sqlData", sql, sqlData, results);
					connection.release();
					return results[0];
				} catch (error) {
					connection.release();
					if (catchError) throw error;
					console.warn("sql-error", error, sql, sqlData);
					return null;
					// } finally {
					// 	connection.release(); // always put connection back in pool after last query
				}
			},
		};

		let files = globule.find(process.cwd() + "/src/**/*.model.js");
		for (let iFile = 0; iFile < files.length; iFile++) {
			let file = files[iFile];
			file = file.substring(0, file.length - 3);
			// console.log("file", file);
			var def = require(file);
			if (def.useUpdatedAt === undefined) def.useUpdatedAt = true;
			if (def.useCreatedAt === undefined) def.useCreatedAt = true;
			if (def.useCreatedAt) def.attributes["createdAt"] = { type: "datetime", index: true };
			if (def.useUpdatedAt) def.attributes["updatedAt"] = { type: "datetime", index: true };
			def.modelname = path.basename(file);
			def.modelname = def.modelname.substring(0, def.modelname.length - 6);
			// console.log("def.modelname", def.modelname);
			def.debug = this.config.debug;
			// global[def.modelname] =
			this.models[def.modelname] = new DbTable(def, this);
		}

		for (const model of Object.values(this.models)) {
			await this.synchronize(model.def);
		}

		for (const model of Object.values(this.models)) {
			await this.constraints(model);
		}
	}

	async constraints(model) {
		let toLink = [];
		for (const [fieldName, field] of Object.entries(model.def.attributes)) {
			if (field.model) toLink.push({ key: fieldName, val: field });
		}
		if (toLink.length) {
			let q = `select * from information_schema.KEY_COLUMN_USAGE where TABLE_NAME='${model.def.tableName}' && TABLE_SCHEMA='${this.config.connection.database}'`; //COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_COLUMN_NAME, REFERENCED_TABLE_NAME
			let actualConstraints = await this.connection.query(q);
			for (let iLink = 0; iLink < toLink.length; iLink++) {
				const link = toLink[iLink];

				let tocreate = true,
					todelete = false;
				for (let iActualConstraint = 0; iActualConstraint < actualConstraints.length; iActualConstraint++) {
					const actualConstraint = actualConstraints[iActualConstraint];
					let q2 = `select * from information_schema.referential_constraints where \`CONSTRAINT_NAME\` like '${actualConstraint.CONSTRAINT_NAME}'`;
					let actualConstraintBis = (await this.connection.query(q2))[0];
					if (!this.models[link.val.model]) {
						console.warn(`Model not found : ${link.val.model}`);
						continue;
					}
					if (
						actualConstraint.COLUMN_NAME == link.key &&
						actualConstraint.REFERENCED_TABLE_NAME == this.models[link.val.model].def.tableName
					) {
						if (actualConstraintBis.UPDATE_RULE == link.val.onUpdate && actualConstraintBis.DELETE_RULE == link.val.onDelete) {
							tocreate = false;
						} else {
							todelete = actualConstraint.CONSTRAINT_NAME;
							tocreate = true;
						}
					}
				}
				if (todelete) {
					let q = `ALTER TABLE \`${model.def.tableName}\` DROP FOREIGN KEY \`${todelete}\``;
					console.warn(q);
					await this.connection.query(q);
				}
				if (tocreate) {
					let q = `ALTER TABLE \`${model.def.tableName}\` ADD CONSTRAINT \`${model.def.tableName}_${
						this.models[link.val.model].def.tableName
					}_${link.key}_fk\` FOREIGN KEY (\`${link.key}\`) REFERENCES \`${this.models[link.val.model].def.tableName}\`(\`${
						this.models[link.val.model].primary
					}\`) ON DELETE ${link.val.onDelete} ON UPDATE ${link.val.onUpdate}`;
					console.warn(q);
					await this.connection.query(q);
				}
			}
		}
	}

	async createTable(def) {
		let what = [];
		for (const [fieldName, field] of Object.entries(def.attributes)) {
			// console.log("field, fieldName", field, fieldName);
			if (field.model) {
				var f = this._getJoinedModel(field);
				if (f) what.push(fieldName + " " + this._ormTypeToDatabaseType(f[0], f[1]));
			} else {
				what.push(
					fieldName +
						" " +
						this._ormTypeToDatabaseType(field.type, field.length) +
						this._getNotnull(field) +
						this._getIndex(field) +
						this._getDefault(field)
				);
			}
		}
		let q = "CREATE TABLE IF NOT EXISTS " + def.tableName + " (" + what.join(", ") + ")";
		console.warn("q", q);
		await this.connection.query(q);
	}
	async updateTable(def) {
		let describe = await this.connection.query("DESCRIBE " + def.tableName + "");
		for (const [fieldName, field] of Object.entries(def.attributes)) {
			let type1 = null;
			if (field.model) {
				let f = this._getJoinedModel(field);
				if (f) {
					type1 = this._ormTypeToDatabaseType(f[0], f[1]);
					field.type = f[0];
					field.length = f[1];
				}
			} else {
				type1 = this._ormTypeToDatabaseType(field.type, field.length);
			}
			let type2 = null,
				def2 = null;

			for (let iRow = 0; iRow < describe.length; iRow++) {
				const row = describe[iRow];
				if (row.Field == fieldName) {
					type2 = row.Type;
					def2 = row.Default;
				}
			}

			if (type2 === null) {
				if (field.model) {
					var f = this._getJoinedModel(field);
					field.type = f[0];
					field.length = f[1];
				}
				let q =
					"ALTER TABLE " +
					def.tableName +
					" ADD " +
					fieldName +
					" " +
					this._ormTypeToDatabaseType(field.type, field.length) +
					this._getNotnull(field) +
					this._getIndex(field) +
					this._getDefault(field);
				console.warn("q", q);
				await this.connection.query(q);
			} else if (
				type1 &&
				type2 &&
				(type1.toLowerCase() != type2.toLowerCase() || (def2 != field.defaultsTo && type1.toLowerCase() != "text"))
			) {
				let q =
					"ALTER TABLE " +
					def.tableName +
					" CHANGE " +
					fieldName +
					" " +
					fieldName +
					" " +
					this._ormTypeToDatabaseType(field.type, field.length) +
					this._getNotnull(field) +
					this._getDefault(field);
				console.warn("q", q);
				await this.connection.query(q);
			}
		}
	}
	async synchronize(def) {
		let exists = true;

		let rows1 = await this.connection.query("SELECT * FROM " + def.tableName + " LIMIT 0,1");
		if (rows1 && this.config.migrate == "recreate") await this.connection.query("DROP TABLE IF EXISTS " + def.tableName + "");
		if (rows1 === null || this.config.migrate == "recreate") exists = false;

		if (this.config.migrate == "alter") {
			if (!exists) await this.createTable(def);
			else await this.updateTable(def);

			let rows2 = await this.connection.query("SHOW INDEX FROM " + def.tableName + "");
			for (const [fieldName, field] of Object.entries(def.attributes)) {
				let createIndex = false;
				if (field.model || field.index) {
					createIndex = true;
					for (let iRows = 0; iRows < rows2.length; iRows++) {
						const row2 = rows2[iRows];
						if (row2.Column_name == fieldName) createIndex = false;
					}
				}
				if (createIndex) {
					let q = "ALTER TABLE " + def.tableName + " ADD INDEX (" + fieldName + ")";
					console.warn("q", q);
					await this.connection.query(q);
				}
			}
		}
	}
	_ormTypeToDatabaseType(ormtype, length, info) {
		if (!info) info = "type";
		let typeJS = "";
		ormtype = ormtype.toLowerCase();
		let res = "";
		if (ormtype == "int" || ormtype == "integer") {
			if (!length) length = 11;
			res = "INT(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "tinyint") {
			if (!length) length = 4;
			res = "TINYINT(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "smallint") {
			if (!length) length = 6;
			res = "SMALLINT(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "mediumint") {
			if (!length) length = 9;
			res = "MEDIUMINT(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "year") {
			if (!length) length = 4;
			res = "YEAR(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "float") {
			res = "FLOAT";
			if (length) res += "(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "double") {
			res = "DOUBLE";
			typeJS = "number";

			// } else if (ormtype=='timestamp') {
			//     res = 'TIMESTAMP' ;
		} else if (ormtype == "date") {
			res = "DATE";
			typeJS = "date";
		} else if (ormtype == "datetime") {
			res = "DATETIME";
			typeJS = "date";
		} else if (ormtype == "char") {
			if (!length) length = 1;
			res = "CHAR(" + length + ")";
			typeJS = "string";
		} else if (ormtype == "varchar" || ormtype == "string") {
			if (!length) length = 255;
			res = "VARCHAR(" + length + ")";
			typeJS = "string";
		} else if (ormtype == "tinytext") {
			res = "TINYTEXT";
			typeJS = "string";
		} else if (ormtype == "mediumtext") {
			res = "MEDIUMTEXT";
			typeJS = "string";
		} else if (ormtype == "longtext") {
			res = "LONGTEXT";
			typeJS = "string";
		} else if (ormtype == "text" || ormtype == "json") {
			res = "TEXT";
			typeJS = "string";
		} else if (ormtype == "enum") {
			res = "ENUM";
			typeJS = "string";
		} else if (ormtype == "set") {
			res = "SET";
			typeJS = "string";
		} else if (ormtype == "decimal" || ormtype == "price") {
			if (!length) length = "10,2";
			res = "DECIMAL(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "bigint") {
			if (!length) length = 20;
			res = "BIGINT(" + length + ")";
			typeJS = "number";
		} else if (ormtype == "time") {
			res = "TIME";
			typeJS = "number";
		} else if (ormtype == "tinyblob") {
			res = "TINYBLOB";
			typeJS = "string";
		} else if (ormtype == "mediumblob") {
			res = "MEDIUMBLOB";
			typeJS = "string";
		} else if (ormtype == "longblob") {
			res = "LONGBLOB";
			typeJS = "string";
		} else if (ormtype == "blob") {
			res = "BLOB";
			typeJS = "string";
		} else if (ormtype == "binary") {
			res = "BINARY";
			typeJS = "binary";
		} else if (ormtype == "varbinary") {
			res = "VARBINARY";
			typeJS = "binary";
		} else if (ormtype == "bit") {
			res = "BIT";
			typeJS = "boolean";
		} else if (ormtype == "boolean") {
			res = "TINYINT(4)";
			typeJS = "boolean";
		}

		if (info == "typejs") return typeJS;
		else return res;
	}
	_getIndex(field) {
		let res = "";
		if (field.primary) res += " PRIMARY KEY";
		if (field.autoincrement) res += " AUTO_INCREMENT";
		return res;
	}
	_getNotnull(field) {
		let res = "";
		if (field.notnull || typeof field.notnull == "undefined") res = " NOT NULL";
		else res = " NULL";
		return res;
	}
	_getDefault(field) {
		let defaultsTo = "";
		if (typeof field.defaultsTo !== "undefined") {
			defaultsTo = ' DEFAULT "' + field.defaultsTo + '"';
			if (field.type == "boolean" && (field.defaultsTo === true || field.defaultsTo === "true")) defaultsTo = " DEFAULT 1";
			if (field.type == "boolean" && (field.defaultsTo === false || field.defaultsTo === "false")) defaultsTo = " DEFAULT 0";
		}
		return defaultsTo;
	}
	_getJoinedModel(field) {
		if (this.models[field.model]) {
			return [this.models[field.model].primaryType, this.models[field.model].primaryLength];
		} else {
			console.warn("Model " + field.model + " not found");
		}
		return null;
	}
	getModels() {
		return this.models;
	}
})();

function Model(models = []) {
	if (models instanceof Array) {
	} else models = [models];
	return function decorator(target) {
		if (!target.prototype._models) target.prototype._models = [];
		target.prototype._models = [...target.prototype._models, ...models];
	};
}

const Migration = new (class {
	dropTable(tableName) {}
	dropField(tableName, fieldName) {}
	renameField(model, oldField, newField) {}
	exec() {}
})();

const Models = DbMysql.models;
export { DbMysql, Model, Models, Migration };
