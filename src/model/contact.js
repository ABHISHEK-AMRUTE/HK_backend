const mongoose = require('mongoose')

const userschema = new mongoose.Schema({
    member_one:{
      type:String,
      trim:true,
      required:true
    },
    member_two:{
        type:String,
        trim:true,
        required:true
    },
    member_one_id:{
        type:mongoose.Schema.Types.ObjectId,
        trim:true,
        required:true
      },
      member_two_id:{
          type:mongoose.Schema.Types.ObjectId,
          trim:true,
          required:true
      },
    message:[{
          name:{
              type:String,
              trim:true,
              required:true
          },
          filename:{
              type:String,
              trim:true
          },
          contentType:{
             type:mongoose.Schema.Types.contentType,
             trim:true
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

const contact = mongoose.model('contact',userschema)
module.exports= contact