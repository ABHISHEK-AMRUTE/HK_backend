const mongoose = require('mongoose')

const userschema = new mongoose.Schema({
    files_id:{
        type : mongoose.Schema.Types.ObjectId
    },
    n:{
        type:Number
    },
    data:{
        type:Buffer
    }
})

const uploads_chunks = mongoose.model('uploads.chunks',userschema)
module.exports= uploads_chunks