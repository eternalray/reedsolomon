const ReedSolomon = require('@ronomon/reed-solomon');
const fs = require('fs');

/* rsencode function
   blob           : file object // Blob object
   options        : set of options(key, value)
   {
    data_shards   : # of data shards(symbols) // integer
    parity_shards : # of parity shards // integer
    buffer_offset : # of bytes attached in front of file // integer (optional)
    header_msg    : non-reedsolomon header (optional)
    footer_msg    : non-reedsolomon footer (optional)
   }
   callback       : to handle encoded buffer
*/

rsencode = function (blob, options, callback){

  var fileSize = blob.size;
  var dataShards = options.data_shards;
  var parityShards = options.parity_shards;
  var bufferOffset = ( options.buffer_offset || 0 );
  var header = ( options.header_msg || '' );
  var footer = ( options.footer_msg || '' );
  var shardOffset = 1; // for index of shards

  if(!(blob instanceof Blob)) throw new Error('blob must be a Blob object');

  var rs = new ReedSolomon(dataShards, parityShards); // including assertion

  var totalShards = dataShards + parityShards;
  var shardLength = Math.floor(fileSize / (dataShards - 1));
  var remainder = fileSize % (dataShards - 1);

  if(remainder > shardLength){
    shardLength = shardLength + Math.floor(remainder / shardLength);
    remainder = remainder % shardLength;
  }

  var paddingLength = shardLength - remainder;
  var paddingString = "";

  for(i = 0; i < paddingLength; i++){
    paddingString = paddingString + "1";
  }

  var reader = new window.FileReader();
  reader.readAsBinaryString(blob);
  reader.onloadend = () => {
      var string = reader.result + paddingString;

      var buffer = Buffer.from(string,"binary");
      var headerBuffer = Buffer.from(header,"binary");
      var footerBuffer = Buffer.from(footer,"binary");

      for(i = 0; i < parityShards; i++){
        buffer = Buffer.concat([
          buffer,
          /* parity shards */
          Buffer.alloc(shardLength,"0"),
        ]);
      }

      // attaching index
      for(i = 0; i < totalShards; i++){
        indexBuffer = Buffer.alloc(1,i);
        if(i == 0){
          buffer = Buffer.concat([indexBuffer,buffer]);
        }
        else{
          tempBuffer1 = buffer.slice(0, (shardLength + shardOffset) * i);
          tempBuffer2 = buffer.slice((shardLength + shardOffset) * i);
          buffer = Buffer.concat([tempBuffer1,indexBuffer,tempBuffer2]);
        }
      }

      buffer = Buffer.concat([
        headerBuffer,
        buffer,
      ]);
      buffer = Buffer.concat([
        buffer,
        footerBuffer,
      ]);

      var bufferSize = (shardLength + shardOffset) * totalShards;
      var shardSize = shardLength;

      rs.encode(
        buffer,
        bufferOffset,
        bufferSize,
        shardLength+shardOffset,
        shardOffset,
        shardSize,
        (error) => {
          if(error) throw error;
          callback(buffer, fileSize, bufferOffset, bufferSize, totalShards, shardLength, shardOffset);
        },
      );
    }
};

/* rsdecode function
   before decoding, remove index number, header and footer

   encoded_buffer   : encoded buffer, remove
   options          : set of options(key, value)
   {
      file_size     : original file_size in bytes // integer
      data_shards   : # of data shards(symbols) // integer
      parity_shards : # of parity shards // integer
      shard_length  : # of bytes in each shard // integer
      targets        : position of error ex) if symbol number 0,4,7 is corrupted, target = 10010001(2)
   }
   callback         : to handle decoded file object
*/

rsdecode = function(encoded_buffer, options, callback){
  var buffer = encoded_buffer;
  var shardLength = options.shard_length;
  var targets = options.targets || 0;
  var bufferOffset = 0;
  var shardOffset = 0; // for index of shards
  var bufferSize = buffer.length - bufferOffset;
  var shardSize = shardLength
  var dataShards = options.data_shards;
  var parityShards = options.parity_shards;
  var fileSize = options.file_size;

  if(!(buffer instanceof Buffer)) throw new Error("encoded_buffer must be instance of Buffer");

  var rs = new ReedSolomon(dataShards, parityShards);

  rs.decode(
    buffer,
    bufferOffset,
    bufferSize,
    shardLength+shardOffset,
    shardOffset,
    shardSize,
    targets,
    (error) => {
      if(error) throw error;
      var decodedBlob = new Blob([buffer]);
      decodedBlob = decodedBlob.slice(0,fileSize);
      callback(decodedBlob);
    }
  )

}
