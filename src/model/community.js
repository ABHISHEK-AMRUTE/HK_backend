const mongoose = require('mongoose')

const userschema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    request:[{
    chat_id:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    name:{
        type:Boolean,
        require:true,
        trim:true
    },
    status:{
        type:Boolean,
        require:true
    }
    }],
    member:[{
        chat_id:{
            type:mongoose.Schema.Types.ObjectId,
            required:true
        },
        name:{
            type:String,
            required:true
        }
    }],
    message:[{
          name:{
              type:String,
              trim:true,
              required:true
          },
          text:{
              type:String,
              trim:true,
              required:true
          },
          timestamp:{
              type:Number,
              required:true
          }
    }]

})

const community = mongoose.model('community',userschema)
module.exports= community