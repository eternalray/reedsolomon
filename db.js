var test = require('./reedsolomon.js');

(function (encode, decode) {
    // IndexedDB
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
        dbVersion = 1.0;

    // Create/open database
    var request = indexedDB.open("elephantFiles", dbVersion),
        db,
        createObjectStore = function (dataBase) {
            // Create an objectStore
            console.log("Creating objectStore")
            dataBase.createObjectStore("elephants");
        },

        getImageFile = function () {
            // Create XHR
            var xhr = new XMLHttpRequest(),
                blob;

            xhr.open("GET", "ETD-Te-Radar-001-1mb.jpg", true);
            // Set the responseType to blob
            xhr.responseType = "blob";

            xhr.addEventListener("load", function () {
                if (xhr.status === 200) {
                    console.log("Image retrieved");

                    // Blob as response
                    blob = xhr.response;
                    console.log("Blob:" + blob.size);

                    // Put the received blob into IndexedDB
                    putElephantInDb(blob);
                }
            }, false);
            // Send XHR
            xhr.send();
        },

        putElephantInDb = function (blob) {
            console.log("Putting elephants in IndexedDB");

            // Open a transaction to the database
            var transaction = db.transaction(["elephants"], "readwrite");

            // Put the blob into the dabase
            var put = transaction.objectStore("elephants").put(blob, "image");


            // Retrieve the file that was just stored
            transaction.objectStore("elephants").get("image").onsuccess = function (event) {
                var imgFile = event.target.result;
                console.log(imgFile);
                // Get window.URL object
                var URL = window.URL || window.webkitURL;

                // Create and revoke ObjectURL
                var imgURL = URL.createObjectURL(imgFile);

                // Set img src to ObjectURL
                var imgElephant = document.getElementById("elephant");
                imgElephant.setAttribute("src", imgURL);

                // Revoking ObjectURL
                URL.revokeObjectURL(imgURL);
                console.log("qwer");
                var options = {
                  data_shards : 21,
                  parity_shards : 10,
                };
                encode(imgFile,options,(encoded_buffer, file_size, buffer_offset, buffer_size, total_shards, shard_length, shard_offset) => {
                  var header_buffer = encoded_buffer.slice(0, buffer_offset);
                  var body_buffer = encoded_buffer.slice(buffer_offset, buffer_size);
                  var footer_buffer = encoded_buffer.slice(buffer_size);
                  var fileSize = file_size;
                  var shardLength = shard_length;
                  var totalShards = total_shards;
                  // removing index
                  for(i = 0; i < total_shards; i++){
                    if(i == 0){
                      body_buffer = body_buffer.slice(shard_offset)
                    }
                    else{
                      temp_buffer1 = body_buffer.slice(0, shardLength * i);
                      temp_buffer2 = body_buffer.slice(shardLength * i + 1);
                      body_buffer = Buffer.concat([temp_buffer1,temp_buffer2]);
                    }
                  }

                  var options = {
                    file_size : fileSize,
                    data_shards : 21,
                    parity_shards : 10,
                    shard_length : shardLength,
                    targets : 0,
                  };

                  decode(body_buffer, options, (decodedBlob) => {
                    var URL2 = window.URL || window.webkitURL;

                    // Create and revoke ObjectURL
                    var imgURL2 = URL2.createObjectURL(decodedBlob);

                    // Set img src to ObjectURL
                    var imgElephant2 = document.getElementById("elephant2");
                    imgElephant2.setAttribute("src", imgURL2);

                    // Revoking ObjectURL
                    URL2.revokeObjectURL(imgURL2);
                  });

                });
            };
        };

    request.onerror = function (event) {
        console.log("Error creating/accessing IndexedDB database");
    };

    request.onsuccess = function (event) {
        console.log("Success creating/accessing IndexedDB database");
        db = request.result;

        db.onerror = function (event) {
            console.log("Error creating/accessing IndexedDB database");
        };

        // Interim solution for Google Chrome to create an objectStore. Will be deprecated
        if (db.setVersion) {
            if (db.version != dbVersion) {
                var setVersion = db.setVersion(dbVersion);
                setVersion.onsuccess = function () {
                    createObjectStore(db);
                    getImageFile();
                };
            }
            else {
                getImageFile();
            }
        }
        else {
            getImageFile();
        }
    }

    // For future use. Currently only in latest Firefox versions
    request.onupgradeneeded = function (event) {
        createObjectStore(event.target.result);
    };

})(rsencode, rsdecode);
