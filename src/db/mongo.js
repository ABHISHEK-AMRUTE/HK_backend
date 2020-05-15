const mongoose = require('mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/chat_app_final',{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology: true 
})
