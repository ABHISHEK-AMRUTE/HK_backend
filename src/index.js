const path = require('path')
const multer = require('multer')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const bodyParser = require('body-parser')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

require('./db/mongo')
const chat_messages = require('./model/chat')



////////Final models//////////
const user  = require('./model/user')
const contact = require('./model/contact')
const community = require('./model/community') 

///////////Multer middleware/////////
const upload = multer({
   
    limits:{
        fileSize : 5000000

    },
    fileFilter(req,file,cb)
    {   
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('Please upload an image'))
        }
        cb(undefined,true)
    }
})
const app = express()
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
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

/////avatar testing//////

app.post('/avatar',upload.single('avatar'),(req,res)=>{
    res.send()
},(error,req,res,next)=>{
    res.send({error:error.message})
})

/////////creating user/////////////

app.post('/registeruser',upload.single('avatar'),(req,res)=>{
   
   user.find({userid:req.body.userid}).exec(function(err,docs){
          if(docs.length!=0){
                res.send({error:"User id already taken! try something unique."})
          }
          else{
            const obj = new user(req.body)
            obj.avatar = req.file.buffer;
            obj.contacts = []
            obj.community = []
            obj.request = []
            obj.save().then(()=>{
               if(obj.account_type==="doctor"){
                    const comm = new community({
                        name:obj.name,
                        owner:obj._id,
                        request:[],
                        member:[],
                        message:[]
                    })

                comm.save().then((object)=>{
                    const new_obj = {community : object,
                     user:obj}
                     res.send(new_obj)
                }).catch(()=>{
                    res.send({error:"not created"})
                })
               }
               else{
                res.send(obj)
               }
            }).catch((e)=>{
                res.send({error : e})
            }) 
          }
   });
  
},(error,req,res,next)=>{
    res.send({error:error.message})
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
    user.find({userid:req.query.userid}).exec(function(err, docs) { 
       if(docs.length!=0)
       {
        let buff = new Buffer(docs[0].avatar);
        let base64data = buff.toString('base64');
       res.send(base64data)
       }

       res.send({error:"no user found"})
   });
})

////updating user profile (editable)
app.get('/edit_my_info',(req,res)=>{
    
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


app.get('/get_users',(req,res)=>{
    user.find(req.body).exec(function(err,docs){
        if(err){
            res.send({error:'unable to find user'})
        }
        else{
            res.send(docs)
        }
    })
})

///adding user to the list "conatcts of users"
/// query parameters
/// member_one : name
/// member_two : name
//  member_one_id  :id
//  member_two_id : id
// ABhishek amrute
// ABhishek amrute
// 5ec20bb9230ff738facc7ce6
// 5ec20e93152c15449c0de67a

// localhost:3000/add_contact?member_one=ABhishek amrute&member_two=ABhishek amrute&member_one_id=5ec20bb9230ff738facc7ce6&member_two_id=5ec20e93152c15449c0de67a
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
         res.send({success:"success! in adding user to contact"})
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

app.post('/save_community_chat',(req,res)=>{
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








server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})

// 
// /home/abhishek/mongodb/bin/mongod --dbpath=/home/abhishek/mongodb-data

// https://healthk-chat.herokuapp.com/