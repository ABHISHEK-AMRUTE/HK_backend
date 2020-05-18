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
const user  = require('./model/user')
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


//////////////routes//////////////////

/////////creating user/////////////

app.post('/registeruser',(req,res)=>{
   
   user.find({userid:req.body.userid}).exec(function(err,docs){
          if(docs.length!=0){
                res.send({error:"User id already taken! try something unique."})
          }
          else{
            const obj = new user(req.body)
            obj.save().then(()=>{
                res.send(obj)
            }).catch((e)=>{
                res.send({error : e})
            }) 
          }
   });
  
})


app.post('/registeruser/c',(req,res)=>{
    user.find({userid:req.query.userid}).exec(function(err,docs){
          
             const obj = docs[0];
             obj.contacts.push({chat_id:"asdasfsdfd54",name:"abhishek"})

             obj.save().then(()=>{
                 res.send(obj)
             }).catch((e)=>{
                 res.send({error : e})
             }) 
           
    });
   
 })
 
 

////getting user info 
app.get('/my_info',(req,res)=>{
    Reg_User.find({userid:req.query.userid}).exec(function(err, docs) { 
         
        res.send(docs)
   });
})




//////GET request to find contact list of user by his userid (user handel)///////
app.get('./get_contact',(req,res)=>{
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
app.get('/get_contact',(req,res)=>{
    user.find({userid:req.query.userid}).exec(function(err,docs){
        if(err){
            res.send({error:'unable to find user'})
        }
        else{
            res.send(docs.community)
        }
    })
})


///adding user to the list "conatcts of users"
/// query parameters
/// member_one : name
/// member_two : name
//  member_one_id  :id
//  member_two_id : id
app.post('/add_contact',(req,res)=>{
    
    //creating contact object
    const obj =  new contact({
        member_one:req.query.member_one,
        member_two:req.query.member_two,
        message:{
            name:"Note",
            text:"Chat initiated",
            timestamp: Date.now()
        }
    })


    //saving contact object to get its _id
    obj.save().then(()=>{

          const chat_id = obj._id  
          //adding chat contact in member one object   
          user.find({_id:req.query.member_one_id}).exec(function(err,result){
             if(result.length==0)
             {
                  res.send({error:"Some error occured in first step"})
             }
             else{
                  const user_one = result[0];
                  user_one.contacts.push({
                      chat_id,
                      name:req.query.member_two
                  });
                  user_one.save()
             }
                
             
          })

          //adding chat contact in member two object   
          user.find({_id:req.query.member_two_id}).exec(function(err,result){
            if(result.length==0)
            {
                 res.send({error:"Some error occured in secnond step"})
            }
            else{
                 const user_one = result[0];
                 user_one.contacts.push({
                     chat_id,
                     name:req.query.member_one
                 });
                 user_one.save()
            }
               
            
         })
         res.send()
    }).catch((err)=>{
        res.send({error:err})
    })

  

})



///saving contact(one-to-one chat messages)
/// query parameters
// _id : chat_id
// name:req.query.name,
// text:req.query.text,
// timestamp:req.query.timestamp

app.post('/save_contacts_chat',(req,res)=>{
    contact.find({_id:req.query._id}).exec(function(err,result){
        if(result.length==0)
        {
            res.send({error:"contact not found"})
        }else{
            const obj = result[0]
            obj.message.push({
                name:req.query.name,
                text:req.query.text,
                timestamp:req.query.timestamp
            })

            obj.save().then(()=>{
                  res.send({success:"sent"})
            }).catch(()=>{
                  res.send({error:"error while storing chat"})
            })
        }
       
    })
})


///saving community chat messages
/// query parameters
// _id : chat_id
// name:req.query.name,
// text:req.query.text,
// timestamp:req.query.timestamp

app.post('/save_contacts_chat',(req,res)=>{
    community.find({_id:req.query._id}).exec(function(err,result){
        if(result.length==0)
        {
            res.send({error:"contact not found"})
        }else{
            const obj = result[0]
            obj.message.push({
                name:req.query.name,
                text:req.query.text,
                timestamp:req.query.timestamp
            })

            obj.save().then(()=>{
                  res.send({success:"sent"})
            }).catch(()=>{
                  res.send({error:"error while storing chat"})
            })
        }
       
    })
})




//creating community
app.post('/create_community',(req,res)=>{

})



server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})

// 
// /home/abhishek/mongodb/bin/mongod --dbpath=/home/abhishek/mongodb-data