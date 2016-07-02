(function (window, Promise, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory(window, Promise));
    } else {
        var orgDriveU = window.DriveU;
        var api = window.DriveU = factory(window, Promise);

        api.noConflict = function () {
            window.DriveU = orgDriveU;
            return api;
        };
    }
}(
window,
window.Promise,
function (window, Promise) {

    var gapi,
        queue = [],
        isReady = false,
        boundary = 'foo_bar_baz_driveu',
        delimiter = "\r\n--" + boundary + "\r\n",
        close_delimiter = "\r\n--" + boundary + "--";

    // ---------- Functions ----------

    function execMethod(context, args, method) {
        return new Promise(function (resolve, reject) {
            var exec = function () {
                method.apply(context, args).then(
                    function () {
                        resolve.apply(null, arguments);
                    },
                    function () {
                        reject.apply(null, arguments);
                    }
                );
            };

            if (!isReady) {
                queue.push(exec);
            } else {
                exec();
            }
        });
    }

    function processParams(paramNames, options) {
        var params = {},
            standardParamNames = ['access_token', 'callback', 'fields', 'key', 'prettyPrint', 'quotaUser', 'userIp'];

        if (typeof options === 'object' && options !== null) {
            paramNames.concat(standardParamNames).forEach(function (name) {
                params[name] = null;

                if (options.hasOwnProperty(name)) {
                    params[name] = options[name];
                }
            });
        }

        return params;
    }

    function listFiles(parameters) {
        return new Promise(function (resolve, reject) {
            var paramNames = ['q', 'orderBy', 'pageSize', 'pageToken', 'corpus', 'spaces'],
                params,
                request;

            parameters = parameters || {};
            params = processParams(paramNames, parameters);

            request = gapi.client.request({
                path: '/drive/v3/files',
                method: 'GET',
                params: params
            });

            request.then(
                function (response) {
                    var result = response.result;

                    if (result === false) {
                        reject(response);
                    } else {
                        resolve(response);
                    }
                },
                function (reason) {
                    reject(reason);
                }
            );
        });
    }

    function getFile(fileId, parameters) {
        return new Promise(function (resolve, reject) {
            if (!fileId) {
                reject({ result: { error: { message: 'Argument fileId is required.' } } });
                return;
            }

            var paramNames = ['acknowledgeAbuse'],
                params,
                request;

            parameters = parameters || {};
            params = processParams(paramNames, parameters);

            request = gapi.client.request({
                path: '/drive/v3/files/' + fileId,
                method: 'GET',
                params: params
            });

            request.then(
                function (response) {
                    resolve(response);
                },
                function (reason) {
                    reject(reason);
                }
            );
        });
    }

    function createFile(data, parameters, metadata) {
        return new Promise(function (resolve, reject) {
            if (data === null || data === undefined) {
                reject({ result: { error: { message: 'Argument data is not a valid value.' } } });
                return;
            }

            var paramNames = ['ignoreDefaultVisibility', 'keepRevisionForever', 'ocrLanguage', 'useContentAsIndexableText'],
                metaNames = ['appProperties', 'contentHints', 'createdTime', 'description', 'folderColorRgb', 'id', 'mimeType', 'modifiedTime', 'name', 'parents', 'properties',
                             'starred', 'viewedByMeTime', 'viewersCanCopyContent', 'writersCanShare'],
                headers = {
                    'Content-Type': 'multipart/related; boundary=' + boundary
                },
                requestBody = [],
                metas = processParams(metaNames, metadata),
                params = processParams(paramNames, parameters),
                dataString = '',
                request;

            if (!metas.mimeType) {
                reject({ result: { error: { message: 'The mimeType metadata is required.' } } });
                return;
            }

            if (typeof data === 'string') {
                dataString = data;
            } else if (typeof data === 'boolean' || typeof data === 'number') {
                dataString = data.toString();
            } else {
                try {
                    dataString = JSON.stringify(data);
                } catch (ex) {

                }
            }

            requestBody.push(delimiter);
            requestBody.push('Content-Type: application/json; charset=UTF-8\r\n\r\n');
            requestBody.push(JSON.stringify(metas));
            
            if (dataString) {
                requestBody.push(delimiter);
                requestBody.push('Content-Type: application/json\r\n\r\n');
                requestBody.push(dataString);
            }
            
            requestBody.push(close_delimiter);

            params.uploadType = 'multipart';

            request = gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                headers: headers,
                params: params,
                body: requestBody.join('')
            });

            request.then(
                function (response) {
                    resolve(response);
                },
                function (reason) {
                    reject(reason);
                }
            );
        });
    }

    function updateFile(fileId, data, parameters, metadata) {
        return new Promise(function (resolve, reject) {
            if (!fileId) {
                reject({ result: { error: { message: 'Argument fileId is required.' } } });
                return;
            }

            if (data === null || data === undefined) {
                reject({ result: { error: { message: 'Argument data is not a valid value.' } } });
                return;
            }

            var paramNames = ['addParents', 'removeParents', 'keepRevisionForever', 'ocrLanguage', 'useContentAsIndexableText'],
                metaNames = ['appProperties', 'contentHints', 'description', 'folderColorRgb', 'mimeType', 'modifiedTime', 'name', 'properties',
                             'starred', 'trashed', 'viewedByMeTime', 'viewersCanCopyContent', 'writersCanShare'],
                headers = {
                    'Content-Type': 'multipart/related; boundary=' + boundary
                },
                requestBody = [],
                metas = processParams(metaNames, metadata),
                params = processParams(paramNames, parameters),
                dataString = '',
                request;

            if (typeof data === 'string') {
                dataString = data;
            } else if (typeof data === 'boolean' || typeof data === 'number') {
                dataString = data.toString();
            } else {
                try {
                    dataString = JSON.stringify(data);
                } catch (ex) {

                }
            }

            requestBody.push(delimiter);
            requestBody.push('Content-Type: application/json; charset=UTF-8\r\n\r\n');
            requestBody.push(JSON.stringify(metas));

            if (dataString) {
                requestBody.push(delimiter);
                requestBody.push('Content-Type: application/json\r\n\r\n');
                requestBody.push(dataString);
            }
            
            requestBody.push(close_delimiter);

            params.uploadType = 'multipart';

            request = gapi.client.request({
                path: '/upload/drive/v3/files/' + fileId,
                method: 'PATCH',
                headers: headers,
                params: params,
                body: requestBody.join('')
            });

            request.then(
                function (response) {
                    resolve(response);
                },
                function (reason) {
                    reject(reason);
                }
            );
        });
    }

    function deleteFile(fileId) {
        return new Promise(function (resolve, reject) {
            if (!fileId) {
                reject({ result: { error: { message: 'Argument fileId is required.' } } });
                return;
            }

            var request;

            request = gapi.client.request({
                path: '/drive/v3/files/' + fileId,
                method: 'DELETE'
            });

            request.then(
                function (response) {
                    resolve(response);
                },
                function (reason) {
                    reject(reason);
                }
            );
        });
    }

    function trashFile(fileId) {
        return updateFile(fileId, '', null, { trashed: true });
    }

    function emptyTrashedFile() {
        return new Promise(function (resolve, reject) {
            var request;

            request = gapi.client.request({
                path: '/drive/v3/files/trash',
                method: 'DELETE'
            });

            request.then(
                function (response) {
                    resolve(response);
                },
                function (reason) {
                    reject(reason);
                }
            );
        });
    }

    function downloadFile(fileId) {
        return new Promise(function (resolve, reject) {
            if (!fileId) {
                reject({ result: { error: { message: 'Argument fileId is required.' } } });
                return;
            }

            var request;
            
            request = gapi.client.request({
                path: '/drive/v3/files/' + fileId,
                method: 'GET',
                params: { alt: 'media' }
            });

            request.then(
                function (response) {
                    resolve(response);
                },
                function (reason) {
                    reject(reason);
                }
            );
        });
    }
    
    function createFolder(name, parents, parameters, metadata) {
        var metas;
            
        if (metadata && typeof metadata === 'object') {
            metas = metadata;
            metas.mimeType = 'application/vnd.google-apps.folder';
        } else {
            metas = {
                mimeType: 'application/vnd.google-apps.folder'
            };
        }
        
        if (name) {
            metas.name = name;
        }
        
        if (window.Array.isArray(parents) && parents.length > 0) {
            metas.parents = parents;
        }
        
        return createFile('', parameters, metas);
    }
    
    function listFolders(parameters) {
        if (parameters.q) {
            parameters.q += " and mimeType = 'application/vnd.google-apps.folder'";
        } else {
            parameters.q = "mimeType = 'application/vnd.google-apps.folder'";
        }
        
        return listFiles(parameters);
    }

    function createPermission(fileId, role, type, parameters, metadata) {
        return new Promise(function (resolve, reject) {
            if (!fileId) {
                reject({ result: { error: { message: 'Argument fileId is required.' } } });
                return;
            }

            if (!role) {
                reject({ result: { error: { message: 'Argument role is required.' } } });
                return;
            } else if (['owner', 'writer', 'commenter', 'reader'].indexOf(role) === -1) {
                reject({ result: { error: { message: 'Argument role is not a valid value.' } } });
                return;
            }

            if (!type) {
                reject({ result: { error: { message: 'Argument type is required.' } } });
                return;
            } else if (['user', 'group', 'domain', 'anyone'].indexOf(type) === -1) {
                reject({ result: { error: { message: 'Argument type is not a valid value.' } } });
                return;
            }

            var paramNames = ['emailMessage', 'sendNotificationEmail', 'transferOwnership'],
                metaNames = ['allowFileDiscovery', 'domain', 'emailAddress'],
                headers = {
                    'Content-Type': 'application/json'
                },
                metas = processParams(metaNames, metadata),
                params = processParams(paramNames, parameters),
                request;

            metas.role = role;
            metas.type = type;

            request = gapi.client.request({
                path: '/drive/v3/files/' + fileId + '/permissions',
                method: 'POST',
                headers: headers,
                params: params,
                body: JSON.stringify(metas)
            });

            request.then(
                function (response) {
                    resolve(response);
                },
                function (reason) {
                    reject(reason);
                }
            );

            return request;
        });
    }

    // ---------- Constructors ----------

    function Files() {
        this.list = function list() {
            return execMethod(
                this,
                arguments,
                listFiles
            );
        };

        this.get = function get() {
            return execMethod(
                this,
                arguments,
                getFile
            );
        };

        this.create = function create() {
            return execMethod(
                this,
                arguments,
                createFile
            );
        };

        this.update = function update() {
            return execMethod(
                this,
                arguments,
                updateFile
            );
        };

        this.del = function del() {
            return execMethod(
                this,
                arguments,
                deleteFile
            );
        };

        this.trash = function trash() {
            return execMethod(
                this,
                arguments,
                trashFile
            );
        };

        this.emptyTrash = function emptyTrash() {
            return execMethod(
                this,
                arguments,
                emptyTrashedFile
            );
        };

        this.download = function download() {
            return execMethod(
                this,
                arguments,
                downloadFile
            );
        };
    }
    
    function Folders() {
        this.create = function create() {
            return execMethod(
                this,
                arguments,
                createFolder
            );
        };
        this.list = function create() {
            return execMethod(
                this,
                arguments,
                listFolders
            );
        };
    }

    function Permissions() {
        this.create = function create() {
            return execMethod(
                this,
                arguments,
                createPermission
            );
        };
    }

    function Constructor() {
        this.files = new Files();
        this.folders = new Folders();
        this.permissions = new Permissions();
        this.init = function () {
            if (!window.gapi) throw new Error('The Google API Client Library has not loaded yet.');

            gapi = window.gapi;

            return new Promise(function (resolve, reject) {
                gapi.client.load('drive', 'v3').then(
                    function () {
                        isReady = true;

                        if (queue.length > 0) {
                            var queueItem;

                            for (var i = 0; i < queue.length; i++) {
                                queueItem = queue[i];

                                queueItem();
                            }
                        }
                    },
                    function (reason) {
                        reject(reason);
                    }
                );
            });
        };
    }

    return new Constructor();
}
));