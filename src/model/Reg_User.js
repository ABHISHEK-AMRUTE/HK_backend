const mongoose = require('mongoose')

const userschema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true
    },
    account_type:{
        type:String,
        required:true
    }
})

const Reg_User = mongoose.model('Reg_User',userschema)
module.exports= Reg_User