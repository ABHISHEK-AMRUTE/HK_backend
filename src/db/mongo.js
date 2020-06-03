const mongoose = require('mongoose')
const url = 'mongodb+srv://Abhishek:abhishekamruteonline@cluster0-b9n3j.mongodb.net/test?retryWrites=true&w=majority'
const conn = mongoose.createConnection(url,{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology: true 
})



// mongodb+srv://ChatDev:Dots-dev@13@3@cluster0-opdx9.mongodb.net/chat_app_final?retryWrites=true&w=majority

