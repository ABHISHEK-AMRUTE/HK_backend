const path = require('path')
const multer = require('multer')
const http = require('http')
const { ExpressPeerServer } = require('peer');
const crypto = require("crypto");
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const bodyParser = require('body-parser')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const GridFsStorage = require("multer-gridfs-storage");

const mongoose = require('mongoose')
const url = 'mongodb+srv://Abhishek:abhishekamruteonline@cluster0-b9n3j.mongodb.net/test?retryWrites=true&w=majority'
mongoose.connect(url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const conn = mongoose.createConnection(url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const one_routes = require('./routes/ont-to-one_routes')
const community_routes = require('./routes/community_routes')

// const chat_messages = require('./model/chat')

////////////GRID FS part/////////////
let gfs;
conn.once("open", () => {
    // init stream
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: "uploads"
    });
});

const storage = new GridFsStorage({
    url: url,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString("hex") + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: "uploads"
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({
    storage
});



////////Final models//////////
const users = require('./model/user')
const contact = require('./model/contact')
const community = require('./model/community')

///////////Multer middleware/////////
const upload_image = multer({

    limits: {
        fileSize: 5000000

    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image'))
        }
        cb(undefined, true)
    }
})
const app = express()
//extra headers
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())
const server = http.createServer(app)
const io = socketio(server)
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/myapp'
  });
  
app.use('/peerjs', peerServer);
const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

// app.use(one_routes)
app.use(community_routes)




////peerserver 

peerServer.on('connection', (client) => {console.log("user joined peerserver")});
peerServer.on('disconnect', (client) => { console.log("user disconnected from peerserver") });



// io.on('connection', (socket) => {

//     console.log('New WebSocket connection')


//     socket.on('join', (options
//         //, 
//        // callback
//         ) => {

//         const { error, user} = addUser({ id: socket.id, username:options.username, room : options.room })
//          const type = options.type

//         // if (error) {
//         //     return callback(error)
//         // }


//         /////loading chat//////
//         if (type == "one-to-one") {

//             contact.findOne({ _id: user.room }).exec(function (err, result) {
//                 if (err) {
//                     io.to(user.room).emit({
//                         text: "Chats not found",
//                         name: null_,
//                         timestamp: Date.now()
//                     })
//                 }

//                 result.message.forEach(element => {
//                     io.to(user.room).emit({
//                         text: element.text,
//                         name: element.name,
//                         timestamp: element.timestamp
//                     })
//                 });

//             })
//         } else {

//         }

//         socket.join(user.room)

//         socket.emit('message', generateMessage('Admin', 'Welcome!'))
//         socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
//         io.to(user.room).emit('roomData', {
//             room: user.room,
//             users: getUsersInRoom(user.room)
//         })

//         // callback()
//     })


//     socket.on('sendMessage', (message
//         //, callback
//         ) => {
//         const user = getUser(socket.id)
//         // const filter = new Filter()

//         // if (filter.isProfane(message.text)) {
//         //     return callback('Profanity is not allowed!')
//         // }
//         ///saving to database

//         contact.findOne({ _id: user.room }).exec(function (err, result) {
//             if (err) {
//                 io.to(user.room).emit({
//                     text: "Error in Storing! Check Internet Connection",
//                     name: null_,
//                     timestamp: Date.now()
//                 })
//             }

//             result.message.push(message)
//             result.save().catch(() => {
//                 io.to(user.room).emit({
//                     text: "Error in Storing! Check Internet Connection",
//                     name: null_,
//                     timestamp: Date.now()
//                 })
//             })


//         })

//         io.to(user.room).emit(message)
//         // callback()
//     })


//     socket.on('sendLocation', (coords, callback) => {
//         const user = getUser(socket.id)
//         io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
//         callback()
//     })

//     socket.on('disconnect', () => {
//         const user = removeUser(socket.id)

//         if (user) {
//             io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
//             io.to(user.room).emit('roomData', {
//                 room: user.room,
//                 users: getUsersInRoom(user.room)
//             })
//         }
//     })
// })



////new connections


io.on('connection', (socket) => {

    console.log('New WebSocket connection')


    socket.on('join', function (data) {

        socket.join(data.room)
        console.log("joined room " + data.room)

        if (data.type == "one-to-one") {

            contact.findOne({ _id: data.room }).exec(function (err, result) {
                if (err) {
                    socket.emit(data.room).emit('new message', {
                        message: "Cannot load previous chats",
                        user: "Healthkrum Bot",
                        time: Date.now()
                    })
                }
                else {
                    result.message.forEach(element => {
                        const obj = {
                            message: element.text,
                            user: element.name,
                            time: element.timestamp
                        }
                        if (element.filename) {
                        obj.filename = element.filename
                            obj.contentType = element.contentType
                        }
                        socket.emit(data.room).emit('new message', obj)
                    });
                }
            })
        }else{

            community.findOne({ _id: data.room }).exec(function (err, result) {
                if (err) {
                    socket.emit(data.room).emit('new message', {
                        message: "Cannot load previous chats",
                        user: "Healthkrum Bot",
                        time: Date.now()
                    })
                }
                else {
                  
                    users.findOne({_id:result.owner}).exec(function(err,i_found_admin){
                          if(err)
                          {
                           socket.emit(data.room).emit('admin_id',{error:"Not found"})
                          }
                          else{
                           socket.emit(data.room).emit('admin_id',{admin_id:i_found_admin.userid})
                          }
                    })

                    result.message.forEach(element => {
                        const obj = {
                            message: element.text,
                            user: element.name,
                            time: element.timestamp,
                            username : element.username
                        }
                        if (element.filename) {
                            obj.filename = element.filename
                            obj.contentType = element.contentType
                        }
                        socket.emit(data.room).emit('new message', obj)
                    });
                }
            })
        }

        socket.broadcast.to(data.room).emit('new user joined', { user: data.username, message: data.username + 'has joined this room.' });

    })

socket.on('typing',function(data){
    io.in(data.room).emit('typing',data)
})




    socket.on('message', function (data) {
        console.log(data);

       if(data.type == "one-to-one")
       {
        contact.findOne({ _id: data.room }).exec(function (err, result) {
            if (err) {
                io.in(data.room).emit('new message', {
                    message: "Error in Storing! Check Internet Connection",
                    user: "HealthKrum Bot",
                    time: Date.now()
                })
            }
            else {
                const obj = {
                    text: data.message,
                    timestamp: data.time,
                    name: data.user
                }

                if (data.filename) {
                    obj.filename = data.filename
                    obj.contentType = data.contentType
                }

                result.message.push(obj)
                result.save().catch((err) => {
                    console.log(err)
                    io.in(data.room).emit('new message', {
                        message: "Error in Storing! Check Internet Connection",
                        user: "HealthKrum Bot",
                        time: Date.now()
                    })
                })
            }

        })

       }else{
        community.findOne({ _id: data.room }).exec(function (err, result) {
            if (err) {
                io.in(data.room).emit('new message', {
                    message: "Error in Storing! Check Internet Connection",
                    user: "HealthKrum Bot",
                    time: Date.now()
                })
            }
            else {
                const obj = {
                    text: data.message,
                    timestamp: data.time,
                    name: data.user,
                    username : data.username
                }

                if (data.filename) {
                    obj.filename = data.filename
                    obj.contentType = data.contentType
                }

                result.message.push(obj)
                result.save().catch((err) => {
                    console.log(err)
                    io.in(data.room).emit('new message', {
                        message: "Error in Storing! Check Internet Connection",
                        user: "HealthKrum Bot",
                        time: Date.now()
                    })
                })
            }

        })
       }



        io.in(data.room).emit('new message', data);

    })



})





//////////////routes//////////////////
//////////uploading files on the server


app.post("/upload_file", upload.single("file"), (req, res) => {
    res.send({ name: req.file.filename, type: req.file.contentType })

});

////getting file from the server
app.get("/download_file", (req, res) => {
    // console.log('id', req.params.id)
    const file = gfs
        .find({
            filename: req.body.filename
        })

        .toArray((err, files) => {
            if (!files || files.length === 0) {
                return res.status(404).json({
                    err: "no files exist"
                });
            }

            // uploads_chunks.findOne({files_id:files._id}).exec(function(err,result){
            //     if(err)
            //     {
            //         res.send({error:"file not found"})
            //     }
            //     res.send(result.data)
            // })
            // res.send(files)
            res.set('content-type', req.body.contentType);
            res.set('accept-ranges', 'bytes');
            gfs.openDownloadStreamByName(req.body.filename).pipe(res);
        });


});


//////////one-to-one stuff////////////

// app.post('/load_chat', (req, res) => {
//     contact.findOne({ _id: req.query._id }).exec(function (err, result) {
//         if (err) {
//             res.send({ error: "not record of chats found" })
//         }
//         res.send(result)
//     })
// })

// app.post('/push_message', (req, res) => {
//     contact.findOne({ _id: req.query._id }).exec(function (err, result) {
//         if (err) {
//             res.send({ error: "not record of chats found" })
//         }
//         result.message.push({
//             name: req.query.name,
//             text: req.query.text,
//             timestamp: req.query.timestamp
//         })
//         result.save().then(() => {
//             res.send(result)
//         }).catch(() => {
//             res.send({ error: "Error in saving chat! try again" })
//         })
//     })
// })

/////////////////////////////////////

/////avatar testing//////

// app.post('/avatar', upload_image.single('avatar'), (req, res) => {
//     res.send()
// }, (error, req, res, next) => {
//     res.send({ error: error.message })
// })

/////////creating user/////////////

app.post('/registeruser', upload_image.single('avatar'), (req, res) => {

    users.find({ userid: req.body.userid }).exec(function (err, docs) {
        if (docs.length != 0) {
            res.send({ error: "User id already taken! try something unique." })
        }
        else {
            const obj = new users(req.body)
            obj.avatar = req.file.buffer;
            obj.contacts = []
            obj.community = []
            obj.request = []
            obj.save().then(() => {
                if (obj.account_type === "doctor") {
                    const comm = new community({
                        name: obj.name + " community",
                        owner: obj._id,
                        request: [],
                        member: [{
                            chat_id: obj._id,
                            name: obj.name
                        }],
                        message: []
                    })

                    comm.save().then((object) => {
                        const new_obj = {
                            community: object,
                            users: obj
                        }
                        obj.community.push({
                            chat_id: object._id,
                            name: obj.name + " community"
                        })
                        obj.save()
                        res.send(new_obj)
                    }).catch(() => {
                        res.send({ error: "not created" })
                    })
                }
                else {
                    res.send(obj)
                }
            }).catch((e) => {
                res.send({ error: e })
            })
        }
    });

}, (error, req, res, next) => {
    res.send({ error: error.message })
})


// app.post('/registeruser/c', (req, res) => {
//     users.find({ userid: req.query.userid }).exec(function (err, docs) {

//         const obj = docs[0];
//         obj.contacts.push({ chat_id: "asdasfsdfd54", name: "abhishek" })

//         obj.save().then(() => {
//             res.send(obj)
//         }).catch((e) => {
//             res.send({ error: e })
//         })

//     });

// })



////getting user info 
app.get('/my_info', (req, res) => {
    users.findOne({ userid: req.query.userid }).exec(function (err, docs) {


        if (err) {
            res.send({ error: "no user found" })
        }
        res.send(docs)
    });
})


////updating user profile (editable)
app.get('/edit_my_info', (req, res) => {

})

//////GET request to find contact list of user by his userid (user handel)///////
app.get('./get_contact', (req, res) => {
    users.find({ userid: req.query.userid }).exec(function (err, docs) {
        if (err) {
            res.send({ error: 'unable to find user' })
        }
        else {
            res.send(docs.contacts)
        }
    })
})


//////GET request to find community list of user by his userid (user handel)///////
app.get('/get_contact', (req, res) => {
    users.find({ userid: req.query.userid }).exec(function (err, docs) {
        if (err) {
            res.send({ error: 'unable to find user' })
        }
        else {
            res.send(docs.community)
        }
    })
})


app.get('/get_users', (req, res) => {
    users.find(req.body).exec(function (err, docs) {
        if (err) {
            res.send({ error: 'unable to find user' })
        }
        else {
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
app.post('/add_contact', (req, res) => {

    contact.find({
        member_one: req.query.member_one,
        member_two: req.query.member_two,
        member_one_id: req.query.member_one_id,
        member_two_id: req.query.member_two_id,

    }).exec(function (error, result) {
        if (error) {
            res.send({ error: "unable to connect to the server! try again." })
        }
        if (result.length == 0) {
            contact.find({
                member_one: req.query.member_two,
                member_two: req.query.member_one,
                member_one_id: req.query.member_two_id,
                member_two_id: req.query.member_one_id,
            }).exec(function (error, result) {
                if (error) {
                    res.send({ error: "unable to connect to the server! try again." })
                }
                if (result.length != 0) {
                    res.send({ error: "The user is already in the contact list" })
                }

                //creating contact object
                const obj = new contact({
                    member_one: req.query.member_one,
                    member_two: req.query.member_two,
                    member_one_id: req.query.member_one_id,
                    member_two_id: req.query.member_two_id,
                    message: {
                        name: "Note",
                        text: "Chat initiated",
                        timestamp: Date.now()
                    }
                })


                //saving contact object to get its _id
                obj.save().then(() => {

                    const chat_id = obj._id
                    //adding chat contact in member one object   
                    users.find({ _id: req.query.member_one_id }).exec(function (err, result) {
                        if (result.length == 0) {
                            res.send({ error: "Some error occured in first step" })
                        }
                        else {
                            const user_one = result[0];
                            user_one.contacts.push({
                                chat_id,
                                userid: req.query.member_two_username,
                                name: req.query.member_two

                            });
                            user_one.save()
                        }


                    })

                    //adding chat contact in member two object   
                    users.find({ _id: req.query.member_two_id }).exec(function (err, result) {
                        if (result.length == 0) {
                            res.send({ error: "Some error occured in secnond step" })
                        }
                        else {
                            const user_one = result[0];
                            user_one.contacts.push({
                                chat_id,
                                userid: req.query.member_one_username,
                                name: req.query.member_one,

                            });
                            user_one.save()
                        }


                    })
                    res.send({ success: "success! in adding user to contact" })
                }).catch((err) => {
                    res.send({ error: err })
                })

            })


        }
        else {
            res.send({ error: "The user is already in the contact list" })
        }
    })



})



///saving contact(one-to-one chat messages)
/// query parameters
// _id : chat_id
// name:req.query.name,
// text:req.query.text,
// timestamp:req.query.timestamp

// app.post('/save_contacts_chat', (req, res) => {
//     contact.find({ _id: req.query._id }).exec(function (err, result) {
//         if (result.length == 0) {
//             res.send({ error: "contact not found" })
//         } else {
//             const obj = result[0]
//             obj.message.push({
//                 name: req.query.name,
//                 text: req.query.text,
//                 timestamp: req.query.timestamp
//             })

//             obj.save().then(() => {
//                 res.send({ success: "sent" })
//             }).catch(() => {
//                 res.send({ error: "error while storing chat" })
//             })
//         }

//     })
// })


///saving community chat messages
/// query parameters
// _id : chat_id
// name:req.query.name,
// text:req.query.text,
// timestamp:req.query.timestamp

// app.post('/save_community_chat', (req, res) => {
//     community.find({ _id: req.query._id }).exec(function (err, result) {
//         if (result.length == 0) {
//             res.send({ error: "contact not found" })
//         } else {
//             const obj = result[0]
//             obj.message.push({
//                 name: req.query.name,
//                 text: req.query.text,
//                 timestamp: req.query.timestamp
//             })

//             obj.save().then(() => {
//                 res.send({ success: "sent" })
//             }).catch(() => {
//                 res.send({ error: "error while storing chat" })
//             })
//         }

//     })
// })



/////////////send community request///////////
///   parameters 
///   community_id 
///   user_id
///   user_name
///   community_name


server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})

// 
// /home/abhishek/mongodb/bin/mongod --dbpath=/home/abhishek/mongodb-data

// https://healthk-chat.herokuapp.com/