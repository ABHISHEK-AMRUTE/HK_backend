const mongoose = require('mongoose')



// name
// owner 
// group_icon
// description
// request
// member
// message


const userschema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    group_icon:{
        type:Buffer
    },
    description : {
        type:String
    },
    request:[{
    chat_id:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    name:{
        type:String,
        require:true,
        trim:true
    },
    status:{
        type:String,
        require:true
    }
    }],
    member:[{
        user_id:{
            type:mongoose.Schema.Types.ObjectId,
            required:true
        },
        name:{
            type:String,
            required:true
        }
    }],
    message:[{
         filename:{
            type:String,
            trim:true
          },
          contentType:{
           type:String,
           trim:true
          },
          username:{
            type:String,
            required:true
          },
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