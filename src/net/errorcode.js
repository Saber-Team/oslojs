/**
 * @fileoverview 错误码用于Oslo.net.IframeIo和Oslo.net.XhrIo.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@net.errorCode', [], function() {

    'use strict';

    /**
     * 错误码
     * @enum {number}
     */
    var ErrorCode = {
        /**
         * No error condition.
         */
        NO_ERROR: 0,
        /**
         * 使用iframeio时经常遇到的错误码, 蛋疼的是, 浏览器返回错误页面会根据不同的域分级. 常见的错误页面有:
         * -- 404, access denied, DNS failure, connection reset etc.
         */
        ACCESS_DENIED: 1,
        /**
         * 这种错误码只会出现在本地文件系统的操作上并且是一个非IE浏览器请求不存在文件时.
         */
        FILE_NOT_FOUND: 2,
        /**
         * Firefox若展示错误页面, 比如连接被服务器重置或者访问拒绝, 它会静默的失败没有任何错误同时load事件也不会触发.
         */
        FF_SILENT_ERROR: 3,
        /**
         * 客户端通过error check hook提供的自定义错误.
         */
        CUSTOM_ERROR: 4,
        /**
         * 处理请求时抛出异常.
         */
        EXCEPTION: 5,
        /**
         * 应答的http status code是个错误码.
         */
        HTTP_ERROR: 6,
        /**
         * 请求中断.
         */
        ABORT: 7,
        /**
         * 请求超时.
         */
        TIMEOUT: 8,
        /**
         * 资源在断网时不可用.
         */
        OFFLINE: 9
    };

    /**
     * 根据相应的错误码返回友好的调试提示信息.
     * @param {ErrorCode} errorCode 错误码.
     * @return {string} 调试信息.
     */
    ErrorCode.getDebugMessage = function(errorCode) {
        switch (errorCode) {
            case ErrorCode.NO_ERROR:
                return 'No Error';
            case ErrorCode.ACCESS_DENIED:
                return 'Access denied to content document';
            case ErrorCode.FILE_NOT_FOUND:
                return 'File not found';
            case ErrorCode.FF_SILENT_ERROR:
                return 'Firefox silently errored';
            case ErrorCode.CUSTOM_ERROR:
                return 'Application custom error';
            case ErrorCode.EXCEPTION:
                return 'An exception occurred';
            case ErrorCode.HTTP_ERROR:
                return 'Http response at 400 or 500 level';
            case ErrorCode.ABORT:
                return 'Request was aborted';
            case ErrorCode.TIMEOUT:
                return 'Request timed out';
            case ErrorCode.OFFLINE:
                return 'The resource is not available offline';
            default:
                return 'Unrecognized error code';
        }
    };

    return ErrorCode;
});