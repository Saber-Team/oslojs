/**
 * @fileoverview 日志和调试工具包.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/debug.html
 */

define('@debug.util',
    [
        '@util',
        '@array',
        '@string.util',
        '@ua.util'
    ],
    function(util, array, string, ua) {

        //'use strict';

        /**
         * Hash map for storing function names that have already been looked up.
         * @type {Object}
         * @private
         */
        var fnNameCache_ = {};


        /**
         * 根据函数得到一个名字. 得到的结果会被缓存.
         * @type {function(Function):string}
         * @private
         */
        var fnNameResolver_;


        /**
         * 调用堆栈的最大长度
         * @type {number}
         */
        var MAX_STACK_DEPTH = 50;


        /**
         * 标准化Error对象.
         * @param {Object} err 原生error对象.
         * @return {Object} Normalized error object.
         */
        var normalizeErrorObject = function(err) {
            var href = window.location.href;
            if (util.isString(err)) {
                return {
                    'message': err,
                    'name': 'Unknown error',
                    'lineNumber': 'Not available',
                    'fileName': href,
                    'stack': 'Not available'
                };
            }

            var lineNumber, fileName;
            var threwError = false;
            try {
                lineNumber = err.lineNumber || err.line || 'Not available';
            } catch (e) {
                // Firefox 2 sometimes throws an error when accessing 'lineNumber':
                // Message: Permission denied to get property UnnamedClass.lineNumber
                lineNumber = 'Not available';
                threwError = true;
            }

            try {
                fileName = err.fileName || err.filename || err.sourceURL || href;
            } catch (e) {
                // Firefox 2 may also throw an error when accessing 'filename'.
                fileName = 'Not available';
                threwError = true;
            }

            // The IE Error object contains only the name and the message.
            // The Safari Error object uses the line and sourceURL fields.
            if (threwError || !err.lineNumber || !err.fileName || !err.stack ||
                !err.message || !err.name) {
                return {
                    'message': err.message || 'Not available',
                    'name': err.name || 'UnknownError',
                    'lineNumber': lineNumber,
                    'fileName': fileName,
                    'stack': err.stack || 'Not available'
                };
            }

            // Standards error object
            return err;
        };


        /**
         * Gets the current stack trace, either starting from the caller or starting
         * from a specified function that's currently on the call stack.
         * @param {Function=} opt_fn 一个可选的函数. 从这个函数开始追踪调用堆栈.
         *     如果没传, 默认为调用此方法的函数.
         * @return {string} Stack trace.
         */
        var getStacktrace = function(opt_fn) {
            return getStacktraceHelper_(opt_fn || arguments.callee.caller, []);
        };


        /**
         * 获取函数名称
         * @param {Function} fn Function to get name of.
         * @return {string} Function's name.
         */
        var getFunctionName = function(fn) {
            // 取缓存
            if (fnNameCache_[fn]) {
                return fnNameCache_[fn];
            }
            // 缓存
            if (fnNameResolver_) {
                var name = fnNameResolver_(fn);
                if (name) {
                    fnNameCache_[fn] = name;
                    return name;
                }
            }

            // Heuristically determine function name based on code.
            var functionSource = String(fn);
            if (!fnNameCache_[functionSource]) {
                // 这个正则只匹配命名函数,
                // 但正则写的也有问题, 匹配不了
                // 命名函数两边的空格, /function(?:\s*)([^\(\s]+)/ 这个好些
                // 这个问题已经提交到论坛
                var matches = /function ([^\(]+)/.exec(functionSource);
                var method;
                if (matches) {
                    method = matches[1];
                    fnNameCache_[functionSource] = method;
                } else {
                    fnNameCache_[functionSource] = '[Anonymous]';
                }
            }

            return fnNameCache_[functionSource];
        };


        /**
         * Private helper for getStacktrace().
         * @param {Function} fn 从哪个函数开始追踪.
         * @param {Array} visited 保留已经遍历过的函数.
         * @return {string} Stack trace starting from function fn.
         * @private
         */
        var getStacktraceHelper_ = function(fn, visited) {
            var sb = [];

            // Circular reference, certain functions like bind seem to cause a recursive
            // loop so we need to catch circular references
            if (array.contains(visited, fn)) {
                sb.push('[...circular reference...]');

                // Traverse the call stack until function not found or max depth is reached
            } else if (fn && visited.length < MAX_STACK_DEPTH) {
                sb.push(getFunctionName(fn) + '(');
                // 填入fn的参数信息
                var args = fn.arguments;
                for (var i = 0; i < args.length; i++) {
                    if (i > 0) {
                        sb.push(', ');
                    }
                    var argDesc;
                    var arg = args[i];
                    switch (typeof arg) {
                        case 'object':
                            argDesc = arg ? 'object' : 'null';
                            break;
                        case 'string':
                            argDesc = arg;
                            break;
                        case 'number':
                            argDesc = String(arg);
                            break;
                        case 'boolean':
                            argDesc = arg ? 'true' : 'false';
                            break;
                        case 'function':
                            argDesc = getFunctionName(arg);
                            argDesc = argDesc ? argDesc : '[fn]';
                            break;
                        case 'undefined':
                        default:
                            argDesc = typeof arg;
                            break;
                    }

                    if (argDesc.length > 40) {
                        argDesc = argDesc.substr(0, 40) + '...';
                    }
                    sb.push(argDesc);
                }
                visited.push(fn);
                sb.push(')\n');

                /** @preserveTry */
                try {
                    sb.push(getStacktraceHelper_(fn.caller, visited));
                } catch (e) {
                    sb.push('[exception trying to get caller]\n');
                }

            } else if (fn) {
                sb.push('[...long stack...]');
            } else {
                sb.push('[end]');
            }
            return sb.join('');
        };


        // expose
        return {
            LOGGING_ENABLED: util.DEBUG,

            /**
             * Catches onerror events fired by windows and similar objects.
             * @param {function(Object)} logFunc 处理错误信息的函数
             * @param {boolean=} opt_cancel 是否阻止错误到达浏览器.
             * @param {Object=} opt_target 触发onerror事件的对象, 通常是window
             */
            catchErrors: function(logFunc, opt_cancel, opt_target) {
                var target = opt_target || util.global;
                var oldErrorHandler = target.onerror;
                var retVal = !!opt_cancel;

                // Chrome interprets onerror return value backwards (http://crbug.com/92062)
                // until it was fixed in webkit revision r94061 (Webkit 535.3). This
                // workaround still needs to be skipped in Safari after the webkit change
                // gets pushed out in Safari.
                // See https://bugs.webkit.org/show_bug.cgi?id=67119
                // IE中event.returnValue = true是阻止onerror上报浏览器,
                // 这个其他大部分dom事件不同. false是执行正常行为.
                // 但webkit内核比较主流,仍然false代表阻止,这次要改成和IE一致,
                // 因为FF也是这么做的.
                if (ua.isWEBKIT &&
                    !ua.isVersionOrHigher('535.3')) {
                    retVal = !retVal;
                }
                target.onerror = function(message, url, line) {
                    // 先触发老的window.onerror处理
                    if (oldErrorHandler) {
                        oldErrorHandler(message, url, line);
                    }
                    logFunc({
                        message: message,
                        fileName: url,
                        line: line
                    });
                    return retVal;
                };
            },

            /**
             * 用字符串表示一个对象的全部属性.
             * Creates a string representing an object and all its properties.
             * @param {Object|null|undefined} obj Object to expose.
             * @param {boolean=} opt_showFn 是否对象的函数也被当做属性, 默认是false.
             * @return {string} The string representation of {@code obj}.
             */
            expose: function(obj, opt_showFn) {
                if (typeof obj == 'undefined') return 'undefined';
                if (obj == null) return 'NULL';

                var str = [];
                for (var x in obj) {
                    if (!opt_showFn && typeof obj[x] == 'function') {
                        continue;
                    }
                    var s = x + ' = ';
                    /** @preserveTry */
                    try {
                        s += obj[x];
                    } catch (e) {
                        s += '*** ' + e + ' ***';
                    }
                    str.push(s);
                }
                return str.join('\n');
            },

            getFunctionName: getFunctionName,

            /**
             * 设置一个自定义的函数名字解析器
             * @param {function(Function): string} resolver Resolves functions to their
             *     names.
             */
            setFunctionResolver: function(resolver) {
                fnNameResolver_ = resolver;
            },

            /**
             * Exposes an exception that has been caught by a try...catch and outputs the
             * error with a stack trace.
             * @param {Object} err Error object or string.
             * @param {Function=} opt_fn Optional function to start stack trace from.
             * @return {string} Details of exception.
             */
            exposeException: function(err, opt_fn) {
                /** @preserveTry */
                try {
                    var e = normalizeErrorObject(err);
                    // Create the error message
                    var error = 'Message: ' + string.htmlEscape(e.message) +
                        '\nUrl: <a href="view-source:' + e.fileName + '" target="_new">' +
                        e.fileName + '</a>\nLine: ' + e.lineNumber + '\n\nBrowser stack:\n' +
                        string.htmlEscape(e.stack + '-> ') +
                        '[end]\n\nJS stack traversal:\n' + string.htmlEscape(getStacktrace(opt_fn) + '-> ');
                    return error;
                } catch (e2) {
                    return 'Exception trying to expose exception! You win, we lose. ' + e2;
                }
            },

            normalizeErrorObject: normalizeErrorObject
        };
    }
);
