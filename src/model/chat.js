const mongoose = require('mongoose')

const userschema = new mongoose.Schema({
    chat_message:{
      type:String,
      required:true,
      trim:true
    },
    name:{
        type:String,
        required:true,
        trim:true
    },
    createdAt:{
        type:Number,
        required:true
    },
    room:{
        type:String,
        required:true,
        trim:true
    }
})

const Chat_message = mongoose.model('chat_messages',userschema)
module.exports= Chat_message