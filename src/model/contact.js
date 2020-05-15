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

const contact = mongoose.model('contact',userschema)
module.exports= contact