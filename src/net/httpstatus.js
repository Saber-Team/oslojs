/**
 * @fileoverview HTTP状态码的常量.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@net.httpStatus', [], function() {

    'use strict';

    /**
     * RFC 2616为HTTP协议定义了HTTP Status Codes.
     * @see http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
     * @enum {number}
     */
    var HttpStatus = {
        // Informational 1xx
        CONTINUE: 100,
        SWITCHING_PROTOCOLS: 101,

        // Successful 2xx
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        NON_AUTHORITATIVE_INFORMATION: 203,
        NO_CONTENT: 204,
        RESET_CONTENT: 205,
        PARTIAL_CONTENT: 206,

        // Redirection 3xx
        MULTIPLE_CHOICES: 300,
        MOVED_PERMANENTLY: 301,
        FOUND: 302,
        SEE_OTHER: 303,
        NOT_MODIFIED: 304,
        USE_PROXY: 305,
        TEMPORARY_REDIRECT: 307,

        // Client Error 4xx
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        PAYMENT_REQUIRED: 402,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        METHOD_NOT_ALLOWED: 405,
        NOT_ACCEPTABLE: 406,
        PROXY_AUTHENTICATION_REQUIRED: 407,
        REQUEST_TIMEOUT: 408,
        CONFLICT: 409,
        GONE: 410,
        LENGTH_REQUIRED: 411,
        PRECONDITION_FAILED: 412,
        REQUEST_ENTITY_TOO_LARGE: 413,
        REQUEST_URI_TOO_LONG: 414,
        UNSUPPORTED_MEDIA_TYPE: 415,
        REQUEST_RANGE_NOT_SATISFIABLE: 416,
        EXPECTATION_FAILED: 417,

        // Server Error 5xx
        INTERNAL_SERVER_ERROR: 500,
        NOT_IMPLEMENTED: 501,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504,
        HTTP_VERSION_NOT_SUPPORTED: 505,

        /*
         * IE在204的情况下返回1223, 因为URLMon.dll的使用, 它会在'Operation Aborted'的时候返回1223.
         * 此时status文本会是'Unknown', response headers是''. 会在XP－IE 6或者Win7-IE9上发生.
         */
        QUIRK_IE_NO_CONTENT: 1223
    };

    /**
     * 是否给定的状态码可认为是成功返回.
     * 其中OK(200), CREATED(201), ACCEPTED(202),
     * NO CONTENT(204), PARTIAL CONTENT(206), NOT MODIFIED(304),
     * 和IE特有的 no content code (1223).
     * @param {number} status 状态码.
     * @return {boolean} 是否正常返回.
     */
    HttpStatus.isSuccess = function(status) {
        switch (status) {
            case HttpStatus.OK:
            case HttpStatus.CREATED:
            case HttpStatus.ACCEPTED:
            case HttpStatus.NO_CONTENT:
            case HttpStatus.PARTIAL_CONTENT:
            case HttpStatus.NOT_MODIFIED:
            case HttpStatus.QUIRK_IE_NO_CONTENT:
                return true;
            default:
                return false;
        }
    };

    return HttpStatus;
});