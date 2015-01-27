/**
 * @fileoverview URIs解析类.
 * Usage:
 * Uri(string): 解析URI.
 * Uri.create(...): 创建Uri新的实例from Uri parts.
 * e.g: <code>var myUri = new Uri(window.location);</code>
 *
 * 见 RFC 3986 for parsing/formatting URIs.
 * http://www.ietf.org/rfc/rfc3986.txt
 *
 * 接口设计类似.NETs, 内部表示不会编码.
 *
 */

define([
    '../util/util',
    '../array/array',
    '../string/util',
    '../ds/map',
    './util',
    '../ds/util'
  ],
  function(util, array, string, Map, UriUtil, ds) {

    'use strict';

    /**
     * This class contains setters and getters for the parts of the URI.
     * The <code>getXyz</code>/<code>setXyz</code> methods return the decoded part
     * -- so<code>Uri.parse('/foo%20bar').getPath()</code> will return the
     * decoded path, <code>/foo bar</code>.
     *
     * The constructor accepts an optional unparsed, raw URI string.  The parser
     * is relaxed, so special characters that aren't escaped but don't cause
     * ambiguities will not cause parse failures.
     *
     * All setters return <code>this</code> and so may be chained, a la
     * <code>Uri.parse('/foo').setFragment('part').toString()</code>.
     *
     * @param {*=} opt_uri Optional string URI to parse
     *        (use Uri.create() to create a URI from parts), or if
     *        a Uri is passed, a clone is created.
     * @param {boolean=} opt_ignoreCase If true, #getParameterValue will ignore
     * the case of the parameter name.
     *
     * @constructor
     */
    var Uri = function(opt_uri, opt_ignoreCase) {
      // Parse in the uri string
      var m;
      if (opt_uri instanceof Uri) {
        this.ignoreCase_ = util.isDef(opt_ignoreCase) ?
          opt_ignoreCase : opt_uri.getIgnoreCase();
        this.setScheme(opt_uri.getScheme());
        this.setUserInfo(opt_uri.getUserInfo());
        this.setDomain(opt_uri.getDomain());
        this.setPort(opt_uri.getPort());
        this.setPath(opt_uri.getPath());
        this.setQueryData(opt_uri.getQueryData().clone());
        this.setFragment(opt_uri.getFragment());
      } else if (opt_uri && (m = UriUtil.split(String(opt_uri)))) {
        this.ignoreCase_ = !!opt_ignoreCase;

        // Set the parts -- decoding as we do so.
        // COMPATABILITY NOTE - In IE, unmatched fields may be empty strings,
        // whereas in other browsers they will be undefined.
        this.setScheme(m[UriUtil.ComponentIndex.SCHEME] || '', true);
        this.setUserInfo(m[UriUtil.ComponentIndex.USER_INFO] || '', true);
        this.setDomain(m[UriUtil.ComponentIndex.DOMAIN] || '', true);
        this.setPort(m[UriUtil.ComponentIndex.PORT]);
        this.setPath(m[UriUtil.ComponentIndex.PATH] || '', true);
        this.setQueryData(m[UriUtil.ComponentIndex.QUERY_DATA] || '', true);
        this.setFragment(m[UriUtil.ComponentIndex.FRAGMENT] || '', true);

      } else {
        this.ignoreCase_ = !!opt_ignoreCase;
        this.queryData_ = new Uri.QueryData(null, null, this.ignoreCase_);
      }
    };

    /**
     * true保留原始值类型,false做类型转换成字符串.
     * @type {boolean}
     */
    Uri.preserveParameterTypesCompatibilityFlag = false;

    /**
     * 防止缓存的参数名.
     * @type {string}
     */
    Uri.RANDOM_PARAM = UriUtil.StandardQueryParam.RANDOM;

    /**
     * 协议.
     * @type {string}
     * @private
     */
    Uri.prototype.scheme_ = '';

    /**
     * User credentials in the form "username:password".
     * @type {string}
     * @private
     */
    Uri.prototype.userInfo_ = '';

    /**
     * 域名, e.g. "www.google.com".
     * @type {string}
     * @private
     */
    Uri.prototype.domain_ = '';

    /**
     * 端口, e.g. 8080.
     * @type {?number}
     * @private
     */
    Uri.prototype.port_ = null;

    /**
     * 路径, e.g. "/tests/img.png".
     * @type {string}
     * @private
     */
    Uri.prototype.path_ = '';

    /**
     * 查询字符串的表示对象.
     * @type {!Uri.QueryData}
     * @private
     */
    Uri.prototype.queryData_;

    /**
     * #后面的哈希片段.
     * @type {string}
     * @private
     */
    Uri.prototype.fragment_ = '';

    /**
     * 是否只读.
     * @type {boolean}
     * @private
     */
    Uri.prototype.isReadOnly_ = false;

    /**
     * 比较参数时是否忽略大小写.
     * @type {boolean}
     * @private
     */
    Uri.prototype.ignoreCase_ = false;

    /**
     * @return {string} The string form of the url.
     * @override
     */
    Uri.prototype.toString = function() {
      var out = [];

      var scheme = this.getScheme();
      if (scheme) {
        out.push(Uri.encodeSpecialChars_(
          scheme, Uri.reDisallowedInSchemeOrUserInfo_), ':');
      }

      var domain = this.getDomain();
      if (domain) {
        out.push('//');

        var userInfo = this.getUserInfo();
        if (userInfo) {
          out.push(Uri.encodeSpecialChars_(
            userInfo, Uri.reDisallowedInSchemeOrUserInfo_), '@');
        }

        out.push(string.urlEncode(domain));

        var port = this.getPort();
        if (port != null) {
          out.push(':', String(port));
        }
      }

      var path = this.getPath();
      if (path) {
        if (this.hasDomain() && path.charAt(0) != '/') {
          out.push('/');
        }
        out.push(Uri.encodeSpecialChars_(
          path,
            path.charAt(0) === '/' ?
            Uri.reDisallowedInAbsolutePath_ :
            Uri.reDisallowedInRelativePath_));
      }

      var query = this.getEncodedQuery();
      if (query) {
        out.push('?', query);
      }

      var fragment = this.getFragment();
      if (fragment) {
        out.push('#', Uri.encodeSpecialChars_(
          fragment, Uri.reDisallowedInFragment_));
      }
      return out.join('');
    };

    /**
     * 解析相对URI (a Uri object), 使用其各个部分构造出绝对URI.
     * 一般有以下几种URIs:
     * 1. foo - 替换路径的最后一部分, 查询字符串和哈希部分
     * 2. /foo - 替换全部路径, 查询字符串和哈希部分
     * 3. //foo - 从域名开始全部替换，新的域名就是foo
     * 4. ?foo - 替换查询字符串和哈希
     * 5. #foo - 仅替换哈希
     *
     * 另外如果相对URI有非空的路径, 所有".." and "."都会被解析, described in RFC 3986.
     *
     * @param {Uri} relativeUri 要解析的相对URI.
     * @return {!Uri} 解析后的URI.
     */
    Uri.prototype.resolve = function(relativeUri) {

      var absoluteUri = this.clone();

      // we satisfy these conditions by looking for the first part of relativeUri
      // that is not blank and applying defaults to the rest

      var overridden = relativeUri.hasScheme();

      if (overridden) {
        absoluteUri.setScheme(relativeUri.getScheme());
      } else {
        overridden = relativeUri.hasUserInfo();
      }

      if (overridden) {
        absoluteUri.setUserInfo(relativeUri.getUserInfo());
      } else {
        overridden = relativeUri.hasDomain();
      }

      if (overridden) {
        absoluteUri.setDomain(relativeUri.getDomain());
      } else {
        overridden = relativeUri.hasPort();
      }

      var path = relativeUri.getPath();
      if (overridden) {
        absoluteUri.setPort(relativeUri.getPort());
      } else {
        overridden = relativeUri.hasPath();
        if (overridden) {
          // resolve path properly
          if (path.charAt(0) !== '/') {
            // path is relative
            if (this.hasDomain() && !this.hasPath()) {
              // RFC 3986, section 5.2.3, case 1
              path = '/' + path;
            } else {
              // RFC 3986, section 5.2.3, case 2
              var lastSlashIndex = absoluteUri.getPath().lastIndexOf('/');
              if (lastSlashIndex !== -1) {
                path = absoluteUri.getPath().substr(0, lastSlashIndex + 1) + path;
              }
            }
          }
          path = Uri.removeDotSegments(path);
        }
      }

      if (overridden) {
        absoluteUri.setPath(path);
      } else {
        overridden = relativeUri.hasQuery();
      }

      if (overridden) {
        absoluteUri.setQueryData(relativeUri.getDecodedQuery());
      } else {
        overridden = relativeUri.hasFragment();
      }

      if (overridden) {
        absoluteUri.setFragment(relativeUri.getFragment());
      }

      return absoluteUri;
    };

    /**
     * Clones the URI instance.
     * @return {!Uri} New instance of the URI objcet.
     */
    Uri.prototype.clone = function() {
      return new Uri(this);
    };

    /**
     * @return {string} The encoded scheme/protocol for the URI.
     */
    Uri.prototype.getScheme = function() {
      return this.scheme_;
    };

    /**
     * Sets the scheme/protocol.
     * @param {string} newScheme New scheme value.
     * @param {boolean=} opt_decode Optional param for whether to decode new value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setScheme = function(newScheme, opt_decode) {
      this.enforceReadOnly();
      this.scheme_ = opt_decode ? Uri.decodeOrEmpty_(newScheme) : newScheme;

      // remove an : at the end of the scheme so somebody can pass in
      // window.location.protocol
      if (this.scheme_) {
        this.scheme_ = this.scheme_.replace(/:$/, '');
      }
      return this;
    };

    /**
     * @return {boolean} Whether the scheme has been set.
     */
    Uri.prototype.hasScheme = function() {
      return !!this.scheme_;
    };

    /**
     * @return {string} The decoded user info.
     */
    Uri.prototype.getUserInfo = function() {
      return this.userInfo_;
    };

    /**
     * Sets the userInfo.
     * @param {string} newUserInfo New userInfo value.
     * @param {boolean=} opt_decode Optional param for whether to decode new value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setUserInfo = function(newUserInfo, opt_decode) {
      this.enforceReadOnly();
      this.userInfo_ = opt_decode ? Uri.decodeOrEmpty_(newUserInfo) :
        newUserInfo;
      return this;
    };

    /**
     * @return {boolean} Whether the user info has been set.
     */
    Uri.prototype.hasUserInfo = function() {
      return !!this.userInfo_;
    };

    /**
     * @return {string} The decoded domain.
     */
    Uri.prototype.getDomain = function() {
      return this.domain_;
    };

    /**
     * Sets the domain.
     * @param {string} newDomain New domain value.
     * @param {boolean=} opt_decode Optional param for whether to decode new value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setDomain = function(newDomain, opt_decode) {
      this.enforceReadOnly();
      this.domain_ = opt_decode ? Uri.decodeOrEmpty_(newDomain) : newDomain;
      return this;
    };

    /**
     * @return {boolean} Whether the domain has been set.
     */
    Uri.prototype.hasDomain = function() {
      return !!this.domain_;
    };

    /**
     * @return {?number} The port number.
     */
    Uri.prototype.getPort = function() {
      return this.port_;
    };

    /**
     * Sets the port number.
     * @param {*} newPort Port number. Will be explicitly casted to a number.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setPort = function(newPort) {
      this.enforceReadOnly();

      if (newPort) {
        newPort = Number(newPort);
        if (isNaN(newPort) || newPort < 0) {
          throw Error('Bad port number ' + newPort);
        }
        this.port_ = newPort;
      } else {
        this.port_ = null;
      }

      return this;
    };

    /**
     * @return {boolean} Whether the port has been set.
     */
    Uri.prototype.hasPort = function() {
      return this.port_ !== null;
    };

    /**
     * @return {string} The decoded path.
     */
    Uri.prototype.getPath = function() {
      return this.path_;
    };

    /**
     * Sets the path.
     * @param {string} newPath New path value.
     * @param {boolean=} opt_decode Optional param for whether to decode new value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setPath = function(newPath, opt_decode) {
      this.enforceReadOnly();
      this.path_ = opt_decode ? Uri.decodeOrEmpty_(newPath) : newPath;
      return this;
    };

    /**
     * @return {boolean} Whether the path has been set.
     */
    Uri.prototype.hasPath = function() {
      return !!this.path_;
    };

    /**
     * @return {boolean} 是否有查询字符串.
     */
    Uri.prototype.hasQuery = function() {
      return this.queryData_.toString() !== '';
    };

    /**
     * Sets the query data.
     * @param {Uri.QueryData|string|undefined} queryData QueryData object.
     * @param {boolean=} opt_decode Optional param for whether to decode new value.
     *     Applies only if queryData is a string.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setQueryData = function(queryData, opt_decode) {
      this.enforceReadOnly();

      if (queryData instanceof Uri.QueryData) {
        this.queryData_ = queryData;
        this.queryData_.setIgnoreCase(this.ignoreCase_);
      } else {
        if (!opt_decode) {
          // QueryData accepts encoded query string, so encode it if
          // opt_decode flag is not true.
          queryData = Uri.encodeSpecialChars_(queryData,
            Uri.reDisallowedInQuery_);
        }
        this.queryData_ = new Uri.QueryData(queryData, null, this.ignoreCase_);
      }

      return this;
    };

    /**
     * Sets the URI query.
     * @param {string} newQuery New query value.
     * @param {boolean=} opt_decode Optional param for whether to decode new value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setQuery = function(newQuery, opt_decode) {
      return this.setQueryData(newQuery, opt_decode);
    };

    /**
     * @return {string} 编码查询字符串, 不包括?.
     */
    Uri.prototype.getEncodedQuery = function() {
      return this.queryData_.toString();
    };

    /**
     * @return {string} The decoded URI query, not including the ?.
     */
    Uri.prototype.getDecodedQuery = function() {
      return this.queryData_.toDecodedString();
    };

    /**
     * Returns the query data.
     * @return {Uri.QueryData} QueryData object.
     */
    Uri.prototype.getQueryData = function() {
      return this.queryData_;
    };

    /**
     * @return {string} The encoded URI query, not including the ?.
     *
     * Warning: This method, unlike other getter methods, returns encoded
     * value, instead of decoded one.
     */
    Uri.prototype.getQuery = function() {
      return this.getEncodedQuery();
    };

    /**
     * Sets the value of the named query parameters, clearing previous values for
     * that key.
     *
     * @param {string} key The parameter to set.
     * @param {*} value The new value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setParameterValue = function(key, value) {
      this.enforceReadOnly();
      this.queryData_.set(key, value);
      return this;
    };

    /**
     * Sets the values of the named query parameters, clearing previous values for
     * that key.  Not new values will currently be moved to the end of the query
     * string.
     *
     * So, <code>Uri.parse('foo?a=b&c=d&e=f').setParameterValues('c', ['new'])
     * </code> yields <tt>foo?a=b&e=f&c=new</tt>.</p>
     *
     * @param {string} key The parameter to set.
     * @param {*} values The new values. If values is a single
     *     string then it will be treated as the sole value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setParameterValues = function(key, values) {
      this.enforceReadOnly();

      if (!util.isArray(values)) {
        values = [String(values)];
      }

      // TODO(nicksantos): This cast shouldn't be necessary.
      this.queryData_.setValues(key, /** @type {Array} */ (values));

      return this;
    };

    /**
     * Returns the value<b>s</b> for a given cgi parameter as a list of decoded
     * query parameter values.
     * @param {string} name The parameter to get values for.
     * @return {Array} The values for a given cgi parameter as a list of
     *     decoded query parameter values.
     */
    Uri.prototype.getParameterValues = function(name) {
      return this.queryData_.getValues(name);
    };

    /**
     * Returns the first value for a given cgi parameter or undefined if the given
     * parameter name does not appear in the query string.
     * @param {string} paramName Unescaped parameter name.
     * @return {string|undefined} The first value for a given cgi parameter or
     *     undefined if the given parameter name does not appear in the query
     *     string.
     */
    Uri.prototype.getParameterValue = function(paramName) {
      // NOTE(nicksantos): This type-cast is a lie when
      // preserveParameterTypesCompatibilityFlag is set to true.
      // But this should only be set to true in tests.
      return /** @type {string|undefined} */ (this.queryData_.get(paramName));
    };

    /**
     * @return {string} The URI fragment, not including the #.
     */
    Uri.prototype.getFragment = function() {
      return this.fragment_;
    };

    /**
     * Sets the URI fragment.
     * @param {string} newFragment New fragment value.
     * @param {boolean=} opt_decode Optional param for whether to decode new value.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.setFragment = function(newFragment, opt_decode) {
      this.enforceReadOnly();
      this.fragment_ = opt_decode ? Uri.decodeOrEmpty_(newFragment) :
        newFragment;
      return this;
    };

    /**
     * @return {boolean} Whether the URI has a fragment set.
     */
    Uri.prototype.hasFragment = function() {
      return !!this.fragment_;
    };

    /**
     * Returns true if this has the same domain as that of uri2.
     * @param {Uri} uri2 The URI object to compare to.
     * @return {boolean} true if same domain; false otherwise.
     */
    Uri.prototype.hasSameDomainAs = function(uri2) {
      return ((!this.hasDomain() && !uri2.hasDomain()) ||
        this.getDomain() === uri2.getDomain()) &&
        ((!this.hasPort() && !uri2.hasPort()) ||
          this.getPort() === uri2.getPort());
    };

    /**
     * Adds a random parameter to the Uri.
     * @return {!Uri} Reference to this Uri object.
     */
    Uri.prototype.makeUnique = function() {
      this.enforceReadOnly();
      this.setParameterValue(Uri.RANDOM_PARAM, string.getRandomString());

      return this;
    };

    /**
     * Removes the named query parameter.
     *
     * @param {string} key The parameter to remove.
     * @return {!Uri} Reference to this URI object.
     */
    Uri.prototype.removeParameter = function(key) {
      this.enforceReadOnly();
      this.queryData_.remove(key);
      return this;
    };

    /**
     * Sets whether Uri is read only. If this Uri is read-only,
     * enforceReadOnly_ will be called at the start of any function that may modify
     * this Uri.
     * @param {boolean} isReadOnly whether this Uri should be read only.
     * @return {!Uri} Reference to this Uri object.
     */
    Uri.prototype.setReadOnly = function(isReadOnly) {
      this.isReadOnly_ = isReadOnly;
      return this;
    };

    /**
     * @return {boolean} Whether the URI is read only.
     */
    Uri.prototype.isReadOnly = function() {
      return this.isReadOnly_;
    };

    /**
     * Checks if this Uri has been marked as read only, and if so, throws an error.
     * This should be called whenever any modifying function is called.
     */
    Uri.prototype.enforceReadOnly = function() {
      if (this.isReadOnly_) {
        throw Error('Tried to modify a read-only Uri');
      }
    };

    /**
     * Sets whether to ignore case.
     * NOTE: If there are already key/value pairs in the QueryData, and
     * ignoreCase_ is set to false, the keys will all be lower-cased.
     * @param {boolean} ignoreCase whether this Uri should ignore case.
     * @return {!Uri} Reference to this Uri object.
     */
    Uri.prototype.setIgnoreCase = function(ignoreCase) {
      this.ignoreCase_ = ignoreCase;
      if (this.queryData_) {
        this.queryData_.setIgnoreCase(ignoreCase);
      }
      return this;
    };


    /**
     * @return {boolean} Whether to ignore case.
     */
    Uri.prototype.getIgnoreCase = function() {
      return this.ignoreCase_;
    };


//==============================================================================
// Static members
//==============================================================================


    /**
     * Creates a uri from the string form.  Basically an alias of new Uri().
     * If a Uri object is passed to parse then it will return a clone of the object.
     *
     * @param {*} uri Raw URI string or instance of Uri
     *     object.
     * @param {boolean=} opt_ignoreCase Whether to ignore the case of parameter
     * names in #getParameterValue.
     * @return {!Uri} The new URI object.
     */
    Uri.parse = function(uri, opt_ignoreCase) {
      return uri instanceof Uri ?
        uri.clone() : new Uri(uri, opt_ignoreCase);
    };


    /**
     * Creates a new Uri object from unencoded parts.
     *
     * @param {?string=} opt_scheme Scheme/protocol or full URI to parse.
     * @param {?string=} opt_userInfo username:password.
     * @param {?string=} opt_domain www.google.com.
     * @param {?number=} opt_port 9830.
     * @param {?string=} opt_path /some/path/to/a/file.html.
     * @param {string|Uri.QueryData=} opt_query a=1&b=2.
     * @param {?string=} opt_fragment The fragment without the #.
     * @param {boolean=} opt_ignoreCase Whether to ignore parameter name case in
     *     #getParameterValue.
     *
     * @return {!Uri} The new URI object.
     */
    Uri.create = function(opt_scheme, opt_userInfo, opt_domain, opt_port,
                          opt_path, opt_query, opt_fragment, opt_ignoreCase) {

      var uri = new Uri(null, opt_ignoreCase);

      // Only set the parts if they are defined and not empty strings.
      opt_scheme && uri.setScheme(opt_scheme);
      opt_userInfo && uri.setUserInfo(opt_userInfo);
      opt_domain && uri.setDomain(opt_domain);
      opt_port && uri.setPort(opt_port);
      opt_path && uri.setPath(opt_path);
      opt_query && uri.setQueryData(opt_query);
      opt_fragment && uri.setFragment(opt_fragment);

      return uri;
    };


    /**
     * Resolves a relative Uri against a base Uri, accepting both strings and
     * Uri objects.
     *
     * @param {*} base Base Uri.
     * @param {*} rel Relative Uri.
     * @return {!Uri} Resolved uri.
     */
    Uri.resolve = function(base, rel) {
      if (!(base instanceof Uri)) {
        base = Uri.parse(base);
      }

      if (!(rel instanceof Uri)) {
        rel = Uri.parse(rel);
      }

      return base.resolve(rel);
    };


    /**
     * Removes dot segments in given path component, as described in
     * RFC 3986, section 5.2.4.
     *
     * @param {string} path A non-empty path component.
     * @return {string} Path component with removed dot segments.
     */
    Uri.removeDotSegments = function(path) {
      if (path == '..' || path == '.') {
        return '';

      } else if (!string.contains(path, './') &&
        !string.contains(path, '/.')) {
        // This optimization detects uris which do not contain dot-segments,
        // and as a consequence do not require any processing.
        return path;

      } else {
        var leadingSlash = string.startsWith(path, '/');
        var segments = path.split('/');
        var out = [];

        for (var pos = 0; pos < segments.length; ) {
          var segment = segments[pos++];

          if (segment == '.') {
            if (leadingSlash && pos == segments.length) {
              out.push('');
            }
          } else if (segment == '..') {
            if (out.length > 1 || out.length == 1 && out[0] != '') {
              out.pop();
            }
            if (leadingSlash && pos == segments.length) {
              out.push('');
            }
          } else {
            out.push(segment);
            leadingSlash = true;
          }
        }

        return out.join('/');
      }
    };


    /**
     * Decodes a value or returns the empty string if it isn't defined or empty.
     * @param {string|undefined} val Value to decode.
     * @return {string} Decoded value.
     * @private
     */
    Uri.decodeOrEmpty_ = function(val) {
      // Don't use UrlDecode() here because val is not a query parameter.
      return val ? decodeURIComponent(val) : '';
    };


    /**
     * If unescapedPart is non null, then escapes any characters in it that aren't
     * valid characters in a url and also escapes any special characters that
     * appear in extra.
     *
     * @param {*} unescapedPart The string to encode.
     * @param {RegExp} extra A character set of characters in [\01-\177].
     * @return {?string} null iff unescapedPart == null.
     * @private
     */
    Uri.encodeSpecialChars_ = function(unescapedPart, extra) {
      if (util.isString(unescapedPart)) {
        return encodeURI(unescapedPart).replace(extra, Uri.encodeChar_);
      }
      return null;
    };


    /**
     * Converts a character in [\01-\177] to its unicode character equivalent.
     * @param {string} ch One character string.
     * @return {string} Encoded string.
     * @private
     */
    Uri.encodeChar_ = function(ch) {
      var n = ch.charCodeAt(0);
      return '%' + ((n >> 4) & 0xf).toString(16) + (n & 0xf).toString(16);
    };


    /**
     * Regular expression for characters that are disallowed in the scheme or
     * userInfo part of the URI.
     * @type {RegExp}
     * @private
     */
    Uri.reDisallowedInSchemeOrUserInfo_ = /[#\/\?@]/g;


    /**
     * Regular expression for characters that are disallowed in a relative path.
     * @type {RegExp}
     * @private
     */
    Uri.reDisallowedInRelativePath_ = /[\#\?:]/g;


    /**
     * Regular expression for characters that are disallowed in an absolute path.
     * @type {RegExp}
     * @private
     */
    Uri.reDisallowedInAbsolutePath_ = /[\#\?]/g;


    /**
     * Regular expression for characters that are disallowed in the query.
     * @type {RegExp}
     * @private
     */
    Uri.reDisallowedInQuery_ = /[\#\?@]/g;


    /**
     * Regular expression for characters that are disallowed in the fragment.
     * @type {RegExp}
     * @private
     */
    Uri.reDisallowedInFragment_ = /#/g;


    /**
     * Checks whether two URIs have the same domain.
     * @param {string} uri1String First URI string.
     * @param {string} uri2String Second URI string.
     * @return {boolean} true if the two URIs have the same domain; false otherwise.
     */
    Uri.haveSameDomain = function(uri1String, uri2String) {
      // Differs from uri.utils.haveSameDomain, since this ignores scheme.
      // TODO(gboyer): Have this just call uri.util.haveSameDomain.
      var pieces1 = UriUtil.split(uri1String);
      var pieces2 = UriUtil.split(uri2String);
      return pieces1[UriUtil.ComponentIndex.DOMAIN] ==
        pieces2[UriUtil.ComponentIndex.DOMAIN] &&
        pieces1[UriUtil.ComponentIndex.PORT] ==
        pieces2[UriUtil.ComponentIndex.PORT];
    };



    /**
     * Class used to represent URI query parameters.  It is essentially a hash of
     * name-value pairs, though a name can be present more than once.
     *
     * Has the same interface as the collections in Oslo.ds.
     *
     * @param {?string=} opt_query Optional encoded query string to parse into
     *     the object.
     * @param {Uri=} opt_uri Optional uri object that should have its
     *     cache invalidated when this object updates. Deprecated -- this
     *     is no longer required.
     * @param {boolean=} opt_ignoreCase If true, ignore the case of the parameter
     *     name in #get.
     * @constructor
     */
    Uri.QueryData = function(opt_query, opt_uri, opt_ignoreCase) {
      /**
       * Encoded query string, or null if it requires computing from the key map.
       * @type {?string}
       * @private
       */
      this.encodedQuery_ = opt_query || null;

      /**
       * If true, ignore the case of the parameter name in #get.
       * @type {boolean}
       * @private
       */
      this.ignoreCase_ = !!opt_ignoreCase;
    };


    /**
     * If the underlying key map is not yet initialized, it parses the
     * query string and fills the map with parsed data.
     * @private
     */
    Uri.QueryData.prototype.ensureKeyMapInitialized_ = function() {
      if (!this.keyMap_) {
        this.keyMap_ = new Map();
        this.count_ = 0;

        if (this.encodedQuery_) {
          var pairs = this.encodedQuery_.split('&');
          for (var i = 0; i < pairs.length; i++) {
            var indexOfEquals = pairs[i].indexOf('=');
            var name = null;
            var value = null;
            if (indexOfEquals >= 0) {
              name = pairs[i].substring(0, indexOfEquals);
              value = pairs[i].substring(indexOfEquals + 1);
            } else {
              name = pairs[i];
            }
            name = string.urlDecode(name);
            name = this.getKeyName_(name);
            this.add(name, value ? string.urlDecode(value) : '');
          }
        }
      }
    };


    /**
     * Creates a new query data instance from a map of names and values.
     *
     * @param {!Map|!Object} map Map of string parameter
     *     names to parameter value. If parameter value is an array, it is
     *     treated as if the key maps to each individual value in the
     *     array.
     * @param {Uri=} opt_uri URI object that should have its cache
     *     invalidated when this object updates.
     * @param {boolean=} opt_ignoreCase If true, ignore the case of the parameter
     *     name in #get.
     * @return {!Uri.QueryData} The populated query data instance.
     */
    Uri.QueryData.createFromMap = function(map, opt_uri, opt_ignoreCase) {
      var keys = ds.getKeys(map);
      if (typeof keys == 'undefined') {
        throw Error('Keys are undefined');
      }

      var queryData = new Uri.QueryData(null, null, opt_ignoreCase);
      var values = ds.getValues(map);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = values[i];
        if (!util.isArray(value)) {
          queryData.add(key, value);
        } else {
          queryData.setValues(key, value);
        }
      }
      return queryData;
    };


    /**
     * Creates a new query data instance from parallel arrays of parameter names
     * and values. Allows for duplicate parameter names. Throws an error if the
     * lengths of the arrays differ.
     *
     * @param {Array.<string>} keys Parameter names.
     * @param {Array} values Parameter values.
     * @param {Uri=} opt_uri URI object that should have its cache
     *     invalidated when this object updates.
     * @param {boolean=} opt_ignoreCase If true, ignore the case of the parameter
     *     name in #get.
     * @return {!Uri.QueryData} The populated query data instance.
     */
    Uri.QueryData.createFromKeysValues = function(
      keys, values, opt_uri, opt_ignoreCase) {
      if (keys.length != values.length) {
        throw Error('Mismatched lengths for keys/values');
      }
      var queryData = new Uri.QueryData(null, null, opt_ignoreCase);
      for (var i = 0; i < keys.length; i++) {
        queryData.add(keys[i], values[i]);
      }
      return queryData;
    };


    /**
     * The map containing name/value or name/array-of-values pairs.
     * May be null if it requires parsing from the query string.
     *
     * We need to use a Map because we cannot guarantee that the key names will
     * not be problematic for IE.
     *
     * @type {Map}
     * @private
     */
    Uri.QueryData.prototype.keyMap_ = null;


    /**
     * The number of params, or null if it requires computing.
     * @type {?number}
     * @private
     */
    Uri.QueryData.prototype.count_ = null;


    /**
     * @return {?number} The number of parameters.
     */
    Uri.QueryData.prototype.getCount = function() {
      this.ensureKeyMapInitialized_();
      return this.count_;
    };


    /**
     * Adds a key value pair.
     * @param {string} key Name.
     * @param {*} value Value.
     * @return {!Uri.QueryData} Instance of this object.
     */
    Uri.QueryData.prototype.add = function(key, value) {
      this.ensureKeyMapInitialized_();
      this.invalidateCache_();

      key = this.getKeyName_(key);
      var values = this.keyMap_.get(key);
      if (!values) {
        this.keyMap_.set(key, (values = []));
      }
      values.push(value);
      this.count_++;
      return this;
    };


    /**
     * Removes all the params with the given key.
     * @param {string} key Name.
     * @return {boolean} Whether any parameter was removed.
     */
    Uri.QueryData.prototype.remove = function(key) {
      this.ensureKeyMapInitialized_();

      key = this.getKeyName_(key);
      if (this.keyMap_.containsKey(key)) {
        this.invalidateCache_();

        // Decrement parameter count.
        this.count_ -= this.keyMap_.get(key).length;
        return this.keyMap_.remove(key);
      }
      return false;
    };

    /**
     * Clears the parameters.
     */
    Uri.QueryData.prototype.clear = function() {
      this.invalidateCache_();
      this.keyMap_ = null;
      this.count_ = 0;
    };

    /**
     * @return {boolean} Whether we have any parameters.
     */
    Uri.QueryData.prototype.isEmpty = function() {
      this.ensureKeyMapInitialized_();
      return this.count_ == 0;
    };

    /**
     * Whether there is a parameter with the given name
     * @param {string} key The parameter name to check for.
     * @return {boolean} Whether there is a parameter with the given name.
     */
    Uri.QueryData.prototype.containsKey = function(key) {
      this.ensureKeyMapInitialized_();
      key = this.getKeyName_(key);
      return this.keyMap_.containsKey(key);
    };


    /**
     * Whether there is a parameter with the given value.
     * @param {*} value The value to check for.
     * @return {boolean} Whether there is a parameter with the given value.
     */
    Uri.QueryData.prototype.containsValue = function(value) {
      // NOTE(arv): This solution goes through all the params even if it was the
      // first param. We can get around this by not reusing code or by switching to
      // iterators.
      var vals = this.getValues();
      return array.contains(vals, value);
    };


    /**
     * Returns all the keys of the parameters. If a key is used multiple times
     * it will be included multiple times in the returned array
     * @return {!Array.<string>} All the keys of the parameters.
     */
    Uri.QueryData.prototype.getKeys = function() {
      this.ensureKeyMapInitialized_();
      // We need to get the values to know how many keys to add.
      var vals = /** @type {Array.<Array|*>} */ (this.keyMap_.getValues());
      var keys = this.keyMap_.getKeys();
      var rv = [];
      for (var i = 0; i < keys.length; i++) {
        var val = vals[i];
        for (var j = 0; j < val.length; j++) {
          rv.push(keys[i]);
        }
      }
      return rv;
    };


    /**
     * Returns all the values of the parameters with the given name. If the query
     * data has no such key this will return an empty array. If no key is given
     * all values wil be returned.
     * @param {string=} opt_key The name of the parameter to get the values for.
     * @return {!Array} All the values of the parameters with the given name.
     */
    Uri.QueryData.prototype.getValues = function(opt_key) {
      this.ensureKeyMapInitialized_();
      var rv = [];
      if (opt_key) {
        if (this.containsKey(opt_key)) {
          rv = rv.concat(this.keyMap_.get(this.getKeyName_(opt_key)));
        }
      } else {
        // Return all values.
        var values = /** @type {Array.<Array|*>} */ (this.keyMap_.getValues());
        for (var i = 0; i < values.length; i++) {
          rv = rv.concat(values[i]);
        }
      }
      return rv;
    };


    /**
     * Sets a key value pair and removes all other keys with the same value.
     *
     * @param {string} key Name.
     * @param {*} value Value.
     * @return {!Uri.QueryData} Instance of this object.
     */
    Uri.QueryData.prototype.set = function(key, value) {
      this.ensureKeyMapInitialized_();
      this.invalidateCache_();

      // TODO(user): This could be better written as
      // this.remove(key), this.add(key, value), but that would reorder
      // the key (since the key is first removed and then added at the
      // end) and we would have to fix unit tests that depend on key
      // ordering.
      key = this.getKeyName_(key);
      if (this.containsKey(key)) {
        this.count_ -= this.keyMap_.get(key).length;
      }
      this.keyMap_.set(key, [value]);
      this.count_++;
      return this;
    };


    /**
     * Returns the first value associated with the key. If the query data has no
     * such key this will return undefined or the optional default.
     * @param {string} key The name of the parameter to get the value for.
     * @param {*=} opt_default The default value to return if the query data
     *     has no such key.
     * @return {*} The first string value associated with the key, or opt_default
     *     if there's no value.
     */
    Uri.QueryData.prototype.get = function(key, opt_default) {
      var values = key ? this.getValues(key) : [];
      if (Uri.preserveParameterTypesCompatibilityFlag) {
        return values.length > 0 ? values[0] : opt_default;
      } else {
        return values.length > 0 ? String(values[0]) : opt_default;
      }
    };


    /**
     * Sets the values for a key. If the key already exists, this will
     * override all of the existing values that correspond to the key.
     * @param {string} key The key to set values for.
     * @param {Array} values The values to set.
     */
    Uri.QueryData.prototype.setValues = function(key, values) {
      this.remove(key);

      if (values.length > 0) {
        this.invalidateCache_();
        this.keyMap_.set(this.getKeyName_(key), array.toArray(values));
        this.count_ += values.length;
      }
    };


    /**
     * @return {string} Encoded query string.
     * @override
     */
    Uri.QueryData.prototype.toString = function() {
      if (this.encodedQuery_) {
        return this.encodedQuery_;
      }

      if (!this.keyMap_) {
        return '';
      }

      var sb = [];

      // In the past, we use this.getKeys() and this.getVals(), but that
      // generates a lot of allocations as compared to simply iterating
      // over the keys.
      var keys = this.keyMap_.getKeys();
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var encodedKey = string.urlEncode(key);
        var val = this.getValues(key);
        for (var j = 0; j < val.length; j++) {
          var param = encodedKey;
          // Ensure that null and undefined are encoded into the url as
          // literal strings.
          if (val[j] !== '') {
            param += '=' + string.urlEncode(val[j]);
          }
          sb.push(param);
        }
      }

      return this.encodedQuery_ = sb.join('&');
    };


    /**
     * @return {string} Decoded query string.
     */
    Uri.QueryData.prototype.toDecodedString = function() {
      return Uri.decodeOrEmpty_(this.toString());
    };


    /**
     * Invalidate the cache.
     * @private
     */
    Uri.QueryData.prototype.invalidateCache_ = function() {
      this.encodedQuery_ = null;
    };


    /**
     * Removes all keys that are not in the provided list. (Modifies this object.)
     * @param {Array.<string>} keys The desired keys.
     * @return {!Uri.QueryData} a reference to this object.
     */
    Uri.QueryData.prototype.filterKeys = function(keys) {
      this.ensureKeyMapInitialized_();
      ds.forEach(this.keyMap_,
        /** @this {Uri.QueryData} */
          function(value, key, map) {
          if (!array.contains(keys, key)) {
            this.remove(key);
          }
        }, this);
      return this;
    };


    /**
     * Clone the query data instance.
     * @return {!Uri.QueryData} New instance of the QueryData object.
     */
    Uri.QueryData.prototype.clone = function() {
      var rv = new Uri.QueryData();
      rv.encodedQuery_ = this.encodedQuery_;
      if (this.keyMap_) {
        rv.keyMap_ = this.keyMap_.clone();
        rv.count_ = this.count_;
      }
      return rv;
    };


    /**
     * Helper function to get the key name from a JavaScript object. Converts
     * the object to a string, and to lower case if necessary.
     * @private
     * @param {*} arg The object to get a key name from.
     * @return {string} valid key name which can be looked up in #keyMap_.
     */
    Uri.QueryData.prototype.getKeyName_ = function(arg) {
      var keyName = String(arg);
      if (this.ignoreCase_) {
        keyName = keyName.toLowerCase();
      }
      return keyName;
    };


    /**
     * Ignore case in parameter names.
     * NOTE: If there are already key/value pairs in the QueryData, and
     * ignoreCase_ is set to false, the keys will all be lower-cased.
     * @param {boolean} ignoreCase whether this Uri should ignore case.
     */
    Uri.QueryData.prototype.setIgnoreCase = function(ignoreCase) {
      var resetKeys = ignoreCase && !this.ignoreCase_;
      if (resetKeys) {
        this.ensureKeyMapInitialized_();
        this.invalidateCache_();
        ds.forEach(this.keyMap_,
          /** @this {Uri.QueryData} */
            function(value, key) {
            var lowerCase = key.toLowerCase();
            if (key != lowerCase) {
              this.remove(key);
              this.setValues(lowerCase, value);
            }
          }, this);
      }
      this.ignoreCase_ = ignoreCase;
    };


    /**
     * Extends a query data object with another query data or map like object. This
     * operates 'in-place', it does not create a new QueryData object.
     *
     * @param {...(Uri.QueryData|Map|Object)} var_args The object
     *     from which key value pairs will be copied.
     */
    Uri.QueryData.prototype.extend = function(var_args) {
      for (var i = 0; i < arguments.length; i++) {
        var data = arguments[i];
        ds.forEach(data,
          /** @this {Uri.QueryData} */
            function(value, key) {
            this.add(key, value);
          }, this);
      }
    };

    return Uri;
  }
);