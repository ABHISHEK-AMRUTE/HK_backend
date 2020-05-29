const mongoose = require('mongoose')

const userschema = new mongoose.Schema({
    userid:{
       type:String,
       required:true
    },
    phone:{
        type:Number,
        default:0
    },
    email:{
      type:String,
      required:true
     },
     description:{
        type:String,
        default:"Available"
     },
    avatar:{
        type:Buffer,
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
        },
        userid:{
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




// {
//     "userid":"hello123",
//     "name":"ABhishek amrute",
//     "createdAt":"123655",
//     "account_type":"patient",
//     "contacts":[{"chat_id":"1232146123",
//                    "name":"i dont know"}],
//     "community":[{"chat_id":"123123",
//     "name":"i dont know"}],
//     "request":[{
//         "chat_id":"56401448616",
//         "status":"done",
//         "name":"don"
//     }]
// }
