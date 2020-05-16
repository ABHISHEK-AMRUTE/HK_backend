const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const bodyParser = require('body-parser')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

require('./db/mongo')
const chat_messages = require('./model/chat')
const Reg_User = require('./model/Reg_User')


////////Final models//////////
const user  = require('./model/chat')
const contact = require('./model/contact')
const community = require('./model/community') 


const app = express()

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {

    console.log('New WebSocket connection') 


    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }
        
        chat_messages.find({room:user.room}).sort({createdAt:1}).exec(function(err, docs) { 
             docs.forEach(element => {
                socket.emit('message', generateMessage(element.name, element.chat_message)) 
             });
        });

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
          ///saving to database
          const mes_obj = generateMessage(user.username, message)
          const obj = new chat_messages({
            chat_message:mes_obj.text,
              name:mes_obj.username,
              createdAt:mes_obj.createdAt,
              room:user.room
          })
          obj.save().then(()=>{
                    console.log('saved to db')
                }).catch(()=>{
                    res.send('error to write data')
                })
        io.to(user.room).emit('message',mes_obj )
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})


app.post('/registeruser',(req,res)=>{
    const obj = new user(req.body)
    console.log(req.Reg_User)
    obj.save().then(()=>{
        res.send(obj)
    }).catch((e)=>{
        res.send({error : e})
    })
})

app.get('/get_users',(req,res)=>{
    Reg_User.find().exec(function(err, docs) { 
         
        res.send(docs)
   });
})




//////GET request to find contact list of user by his userid (user handel)///////
app.get('./get_contact/',(req,res)=>{
    user.find({userid:req.query.userid}).exec(function(err,docs){
        if(err){
            res.send({error:'unable to find user'})
        }
        else{
            res.send(docs.contacts)
        }
    })
})

//////GET request to find community list of user by his userid (user handel)///////
app.get('./get_contact/',(req,res)=>{
    user.find({userid:req.query.userid}).exec(function(err,docs){
        if(err){
            res.send({error:'unable to find user'})
        }
        else{
            res.send(docs.community)
        }
    })
})



server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})






// 
// /home/abhishek/mongodb/bin/mongod --dbpath=/home/abhishek/mongodb-data