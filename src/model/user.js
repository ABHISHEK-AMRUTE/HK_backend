const mongoose = require('mongoose')

const userschema = new mongoose.Schema({
    userid:{
       type:String,
       required:true
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
    account_type:{
        type:String,
        required:true,
        trim:true
    },
    contacts :[{
        chat_id:{
            type:mongoose.Schema.Types.ObjectId,
            required:true
        },
        name:{
            type:String,
            required:true
        }
    }],
    community:[{
        chat_id:{
            type:mongoose.Schema.Types.ObjectId,
            required:true
        },
        name:{
            type:String,
            required:true
        }
    }],
    request:[{
        chat_id:{
            type:String,
            required:true,
            trim:true
        },
        status:{
            type:String,
            required:true,
            trim:true
        },
        name:{
            type:String,
            required:true,
            trim:true
        }
    }]
})


const user = mongoose.model('user',userschema)
module.exports= user