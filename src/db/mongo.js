const mongoose = require('mongoose')

mongoose.connect('mongodb+srv://ChatDev:Dots-dev@13@3@cluster0-opdx9.mongodb.net/chat_app_final?retryWrites=true&w=majority',{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology: true 
})
