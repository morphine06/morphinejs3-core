"use strict"; // warning : reactiver

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

module.exports = class {
  constructor(app, baseurl, model) {
    var methods = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : ["find", "findone", "create", "update", "destroy"];
    //["find", "findone", "create", "update", "destroy"]
    if (!methods) methods = [];
    this.app = app;
    this.baseurl = baseurl;
    this.model = model;
    this.populateOnFind = true;
    if (methods.indexOf("find") >= 0) app.get(this.baseurl + "", Policies.checkAccessTocken, this.find.bind(this));
    if (methods.indexOf("findone") >= 0) app.get(this.baseurl + "/:id", Policies.checkAccessTocken, this.findone.bind(this));
    if (methods.indexOf("create") >= 0) app.post(this.baseurl + "", Policies.checkAccessTocken, this.create.bind(this));
    if (methods.indexOf("update") >= 0) app.put(this.baseurl + "/:id", Policies.checkAccessTocken, this.update.bind(this));
    if (methods.indexOf("destroy") >= 0) app.delete(this.baseurl + "/:id", Policies.checkAccessTocken, this.destroy.bind(this));
  } // send(res,errorKeyOrData) {
  // 	let status = 200,
  // 		data = { err: null, data: null };
  // 	errorKeyOrData = errorKeyOrData || {};
  // 	if (_.isString(errorKeyOrData)) {
  // 		data.err = this.getErrorCode(errorKeyOrData);
  // 		status = data.err.status;
  // 	} else {
  // 		data = errorKeyOrData;
  // 		data.err = null;
  // 	}
  // 	// console.log("err :", err);
  // 	res.status(status).send(data);
  // }


  find(req, res) {
    var _this = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this.model) return Services.send(res, "model_not_defined");
      var {
        rows,
        total
      } = yield _this._find(req);
      Services.send(res, {
        data: rows,
        meta: {
          total: total
        }
      });
    })();
  }

  findone(req, res) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this2.model) return Services.send(res, "model_not_defined");
      var row = yield _this2._findone(req);
      if (!row) return Services.send(res, "not_found");
      Services.send(res, {
        data: row
      });
    })();
  }

  create(req, res) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this3.model) return Services.send(res, "model_not_defined");
      var row = yield _this3._create(req);
      Services.send(res, {
        data: row
      });
    })();
  }

  update(req, res) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this4.model) return Services.send(res, "model_not_defined");
      var row = yield _this4._update(req);
      if (!row) return Services.send(res, "not_found");
      Services.send(res, {
        data: row
      });
    })();
  }

  destroy(req, res) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this5.model) return _this5.send(res, {
        err: Services.err(501),
        data: null
      });
      var oldrow = yield _this5._destroy(req);
      Services.send(res, {
        data: oldrow
      });
    })();
  }

  findCreateOrderBy(req) {
    return _asyncToGenerator(function* () {
      var orderby = ""; // @Marina je corrige ici, car il faut rajouter le orderSort, uniquement s'il y a un req.query.sort

      if (req.query.sort) {
        var orderSort = "";
        if (req.query.order_sort) orderSort = req.query.order_sort.replace(/\\/g, "");
        orderby = " order by " + req.query.sort.replace(/\\/g, "") + " " + orderSort;
      }

      return orderby;
    })();
  }

  findCreateLimit(req) {
    return _asyncToGenerator(function* () {
      var limit = "",
          skip = 0;

      if (req.query.skip != undefined && req.query.skip != "NaN" && typeof (req.query.skip * 1) === "number") {
        skip = req.query.skip * 1;
      }

      if (req.query.limit != undefined && typeof (req.query.limit * 1) === "number") {
        // if (!req.query.skip || !_.isNumber(req.query.skip * 1)) req.query.skip = 0;
        limit = " limit " + skip + "," + req.query.limit * 1;
      }

      return limit;
    })();
  }

  findCreateWhere(req) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      var where = "1=1",
          whereData = [];

      function findCreateWhereForField(tx, field, value) {
        // console.log("field", field);
        if (value.indexOf("contains:") === 0) {
          where += " && " + tx + "." + field + " like ?";
          whereData.push("%" + value.substring(9) + "%");
        } else if (value.indexOf("startwith:") === 0) {
          where += " && " + tx + "." + field + " like ?";
          whereData.push(value.substring(10) + "%");
        } else if (value.indexOf("endwith:") === 0) {
          where += " && " + tx + "." + field + " like ?";
          whereData.push("%" + value.substring(8));
        } else if (value.indexOf(">=") === 0) {
          where += " && " + tx + "." + field + " >= ?";
          whereData.push(value.substring(2));
        } else if (value.indexOf(">") === 0) {
          where += " && " + tx + "." + field + " > ?";
          whereData.push(value.substring(1));
        } else if (value.indexOf("<=") === 0) {
          where += " && " + tx + "." + field + " <= ?";
          whereData.push(value.substring(2));
        } else if (value.indexOf("<") === 0) {
          where += " && " + tx + "." + field + " < ?";
          whereData.push(value.substring(1));
        } else {
          where += " && " + tx + "." + field + "=?";
          whereData.push(req.query[field]);
        }
      }

      Object.entries(_this6.model.def.attributes).forEach((_ref, index) => {
        var [field, defField] = _ref;
        // console.log("field", field, req.query[field]);
        // if (defField.model) {
        // 	let modelJoin = global[defField.model];
        // 	_.each(modelJoin.def.attributes, (defFieldJoin, fieldJoin) => {
        // 		if (req.query[fieldJoin]) findCreateWhereForField("t1",fieldJoin, req.query[fieldJoin]);
        // 		if (req.query[fieldJoin + "__"]) findCreateWhereForField("t1",fieldJoin, req.query[fieldJoin + "__"]);
        // 	});
        // } else {
        if (req.query[field]) findCreateWhereForField("t1", field, req.query[field] + "");
        if (req.query[field + "_"]) findCreateWhereForField("t1", field, req.query[field + "_"]);
        if (req.query[field + "__"]) findCreateWhereForField("t1", field, req.query[field + "__"]);
        if (req.query[field + "___"]) findCreateWhereForField("t1", field, req.query[field + "___"]); // }
      }); // console.log("where,whereData", where, whereData);

      return {
        where,
        whereData
      };
    })();
  }

  _find(req) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      // let model = this.model;
      var {
        where,
        whereData
      } = yield _this7.findCreateWhere(req); // console.log("where,whereData", where, whereData);

      var limit = yield _this7.findCreateLimit(req);
      var orderby = yield _this7.findCreateOrderBy(req);

      var toexec = _this7.model.find(where + orderby + limit, whereData); // console.log("where + orderby + limit, whereData", where + orderby + limit, whereData);
      // if (this.populateOnFind) {


      if (_this7.populateOnFind) {
        Object.entries(_this7.model.def.attributes).forEach((_ref2, index) => {
          var [field, defField] = _ref2;
          if (defField.model) toexec.populate(field);
        });
      } // }
      // let t0;
      // t0 = moment();


      var rows = yield toexec.exec(); // console.log("rows", rows);
      // console.log("diff1", t0.diff(moment()));
      // t0 = moment();

      var total = rows.length;

      if (limit) {
        // console.log("where,whereData", where, whereData);
        var _toexec = _this7.model.count(where + orderby, whereData);

        if (_this7.populateOnFind) {
          Object.entries(_this7.model.def.attributes).forEach((_ref3, index) => {
            var [field, defField] = _ref3;
            if (defField.model) _toexec.populate(field);
          });
        }

        total = yield _toexec.exec(); // console.log("rows_temp", rows_temp);
        // total = rows_temp.length;
      } // console.log("diff2", t0.diff(moment()));


      return {
        rows,
        total
      };
    })();
  }

  createEmpty(req) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      //Services.simpleSanitizeReq(req);
      var primary = _this8._getPrimary(_this8.model);

      var row = _this8.model.createEmpty();

      row[primary] = "";
      return row;
    })();
  }

  _getPrimary(model) {
    var primary = null;
    Object.entries(model.def.attributes).forEach((_ref4, index) => {
      var [field, defField] = _ref4;
      if (defField.primary) primary = field;
    });
    return primary;
  }

  _findone(req) {
    var _arguments = arguments,
        _this9 = this;

    return _asyncToGenerator(function* () {
      var morePopulate = _arguments.length > 1 && _arguments[1] !== undefined ? _arguments[1] : [];

      //Services.simpleSanitizeReq(req);
      // let model = this.model;
      var where = "",
          whereData = [],
          primary = _this9._getPrimary(_this9.model),
          row,
          id = req.params.id || req.params[primary];

      if (id * 1 < 0) {
        // console.log("createempty");
        row = yield _this9.createEmpty(req);
      } else {
        where += "t1." + primary + "=?";
        whereData.push(id);

        var toexec = _this9.model.findone(where, whereData);

        Object.entries(_this9.model.def.attributes).forEach((_ref5, index) => {
          var [field, defField] = _ref5;
          if (defField.model) toexec.populate(field);
        });
        morePopulate.forEach(field => {
          toexec.populate(field);
        });
        row = yield toexec.exec();
      }

      return row;
    })();
  }

  _compareData(oldData, newData) {
    // console.log("oldData, newData", oldData, newData);
    var compare = {};
    Object.entries(oldData).forEach((_ref6, index) => {
      var [keyoldval, oldval] = _ref6;
      // console.log("keyoldval, typeof ok[keyoldval]", keyoldval, typeof ok[keyoldval]);
      // if (_.isArray(ok[keyoldval])) return ;
      // if (_.isPlainObject(ok[keyoldval])) return ;
      if (keyoldval == "updatedAt") return;
      if (keyoldval == "createdAt") return;
      if (newData[keyoldval] == undefined) return;
      var newval = newData[keyoldval]; // console.log("oldval, newval", keyoldval, oldval, newval, typeof oldval, typeof newval);

      if (!oldval && !newval) return;
      if (oldval && oldval instanceof Date && !isNaN(oldval.valueOf())) oldval = oldval.toString();
      if (newval && newval instanceof Date && !isNaN(newval.valueOf())) newval = newval.toString();
      if (Array.isArray(oldval)) oldval = JSON.stringify(oldval);
      if (Array.isArray(newval)) newval = JSON.stringify(newval);
      if (this.isObject(oldval)) oldval = JSON.stringify(oldval);
      if (this.isObject(newval)) newval = JSON.stringify(newval);

      if (newval != oldval) {
        compare[keyoldval + "_old"] = oldval;
        compare[keyoldval + "_new"] = newval;
      }
    });
    return compare;
  }

  isObject(o) {
    return Object.prototype.toString.call(o) === "[object Object]";
  }

  _create(req) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      //Services.simpleSanitizeReq(req);
      _this10._checkPopulateSended(req);

      var newrow = yield _this10.model.create(req.body).exec(true);
      req.params.id = newrow[_this10._getPrimary(_this10.model)];
      if (_this10.modellogevents) yield _this10._log(req, "create", null, newrow);
      return yield _this10._findone(req);
    })();
  }

  _checkPopulateSended(req) {
    Object.entries(this.model.def.attributes).forEach((_ref7, index) => {
      var [field, defField] = _ref7;

      if (defField.model) {
        // console.log("defField.model :", defField.model);
        if (req.body[field] && this.isObject(req.body[field])) {
          var modelToJoin = global[defField.model];

          var primaryToJoin = this._getPrimary(modelToJoin);

          if (primaryToJoin) req.body[field] = req.body[field][primaryToJoin];
        }
      }
    });
  }

  _update(req, cb) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      //Services.simpleSanitizeReq(req);
      var primary = _this11._getPrimary(_this11.model),
          id = req.params.id || req.params[primary],
          where = "" + primary + "=?",
          whereData = [id],
          oldrow,
          newrow;

      if (_this11.modellogevents) {
        oldrow = yield _this11.model.findone(where, whereData).exec();
        if (!oldrow) return null;
      }

      delete req.body[primary];

      _this11._checkPopulateSended(req);

      var row = yield _this11.model.update(where, whereData, req.body).exec();
      if (!row) return null;
      if (row.length) newrow = row[0];
      if (_this11.modellogevents) yield _this11._log(req, "update", oldrow, newrow);
      return yield _this11._findone(req);
    })();
  }

  _destroy(req) {
    var _arguments2 = arguments,
        _this12 = this;

    return _asyncToGenerator(function* () {
      var updateDeleteField = _arguments2.length > 1 && _arguments2[1] !== undefined ? _arguments2[1] : false;

      //Services.simpleSanitizeReq(req);
      var where = "",
          whereData = [],
          oldrow,
          log = _this12.modellogevents,
          id = req.params.id || req.params[_this12._getPrimary(_this12.model)];

      where = _this12._getPrimary(_this12.model) + "=?";
      whereData = id;
      oldrow = yield _this12.model.findone(where, whereData).exec();
      if (!oldrow) return null;
      if (log) yield _this12._log(req, "destroy", oldrow, null);

      if (updateDeleteField === false) {
        yield _this12.model.destroy(where, whereData).exec();
      } else {
        var d = {};
        d[updateDeleteField] = true;
        yield _this12.model.update(where, whereData, d).exec();
      }

      return oldrow;
    })();
  }

  _log(req, modelEvent, oldrow, newrow) {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      var id = req.params.id || req.params[_this13._getPrimary(_this13.model)];

      var c = "";
      if (modelEvent == "create") c = newrow;else if (modelEvent == "destroy") c = oldrow;else if (modelEvent == "update") c = _this13._compareData(oldrow, newrow);
      yield Logs.create({
        us_id_user: req.user ? req.user.us_id : 0,
        lg_model_event: modelEvent,
        lg_model_name: _this13.modelname,
        lg_model_id: id,
        lg_data: c
      }).exec();
    })();
  }

  before(req, res) {
    return _asyncToGenerator(function* () {})();
  }

  policy(req, res) {
    return _asyncToGenerator(function* () {
      return true;
    })();
  } // policies(req, res, next) {
  // 	console.log("iciciicci");
  // 	let ok = true;
  // 	async.eachSeries(
  // 		req.policies,
  // 		(policy, nextPolicy) => {
  // 			if (!Policies[policy]) {
  // 				console.warn("Policy " + policy + " not found");
  // 				ok = false;
  // 				return nextPolicy();
  // 			}
  // 			Policies[policy](req, res, ok => {
  // 				if (!ok) ok = false;
  // 				nextPolicy();
  // 			});
  // 		},
  // 		() => {
  // 			next(ok);
  // 		}
  // 	);
  // }


  render(page, params) {
    this.res.render(page, params);
  } // send(res, data) {
  // 	Services.send(res, data);
  // }


};
//# sourceMappingURL=BaseController.js.map